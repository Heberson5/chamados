import subprocess
import sys

def run_query(query):
    result = subprocess.run(['psql', '-t', '-A', '-c', query], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running query: {query}\n{result.stderr}")
        return ""
    return result.stdout.strip()

# 1. Get all tables with id_numerico
tables_query = "SELECT table_name FROM information_schema.columns WHERE column_name = 'id_numerico' AND table_schema = 'public';"
tables = [t for t in run_query(tables_query).split('\n') if t]

# 2. Get all FKs
fks_query = """
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table_name,
    af.attname AS foreign_column_name
FROM
    pg_constraint c
JOIN
    pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
LEFT JOIN
    pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
WHERE
    c.connamespace = 'public'::regnamespace
    AND contype = 'f';
"""
fks_raw = run_query(fks_query).split('\n')
fks = []
for line in fks_raw:
    parts = line.split('|')
    if len(parts) >= 5:
        fks.append({
            'constraint_name': parts[0],
            'table_name': parts[1],
            'column_name': parts[2],
            'foreign_table_name': parts[3],
            'foreign_column_name': parts[4]
        })

sql = []
sql.append("BEGIN;")

# Prepare profiles
sql.append("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;")
sql.append("UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;")

# Drop all FKs pointing to tables we are changing
for table in tables:
    pointing_fks = [fk for fk in fks if fk['foreign_table_name'] == table]
    for fk in pointing_fks:
        sql.append(f"ALTER TABLE public.{fk['table_name']} DROP CONSTRAINT IF EXISTS {fk['constraint_name']};")

# Drop all PKs
for table in tables:
    sql.append(f"ALTER TABLE public.{table} DROP CONSTRAINT IF EXISTS {table}_pkey CASCADE;")

# Rename and Switch
for table in tables:
    # Rename current id
    sql.append(f"ALTER TABLE public.{table} RENAME COLUMN id TO old_uuid_id;")
    # Rename id_numerico to id
    sql.append(f"ALTER TABLE public.{table} RENAME COLUMN id_numerico TO id;")
    # Set PK
    sql.append(f"ALTER TABLE public.{table} ADD PRIMARY KEY (id);")

# Update FK data
for table in tables:
    pointing_fks = [fk for fk in fks if fk['foreign_table_name'] == table]
    for fk in pointing_fks:
        sql.append(f"-- Updating {fk['table_name']}.{fk['column_name']} pointing to {table}")
        sql.append(f"ALTER TABLE public.{fk['table_name']} ADD COLUMN IF NOT EXISTS {fk['column_name']}_new BIGINT;")
        sql.append(f"UPDATE public.{fk['table_name']} t SET {fk['column_name']}_new = r.id FROM public.{table} r WHERE t.{fk['column_name']} = r.old_uuid_id;")
        sql.append(f"ALTER TABLE public.{fk['table_name']} DROP COLUMN IF EXISTS {fk['column_name']};")
        sql.append(f"ALTER TABLE public.{fk['table_name']} RENAME COLUMN {fk['column_name']}_new TO {fk['column_name']};")
        sql.append(f"ALTER TABLE public.{fk['table_name']} ADD CONSTRAINT {fk['constraint_name']} FOREIGN KEY ({fk['column_name']}) REFERENCES public.{table}(id);")

# Fix RLS helper
sql.append("""
CREATE OR REPLACE FUNCTION public.my_id() RETURNS BIGINT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$;
""")

# Re-create RLS for common cases
sql.append("DROP POLICY IF EXISTS \"User view own chamados\" ON public.chamados;")
sql.append("CREATE POLICY \"User view own chamados\" ON public.chamados FOR SELECT USING (usuario_id = my_id());")
sql.append("DROP POLICY IF EXISTS \"User create own chamados\" ON public.chamados;")
sql.append("CREATE POLICY \"User create own chamados\" ON public.chamados FOR INSERT WITH CHECK (usuario_id = my_id());")
sql.append("DROP POLICY IF EXISTS \"profiles_self_all\" ON public.profiles;")
sql.append("CREATE POLICY \"profiles_self_all\" ON public.profiles USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());")

sql.append("COMMIT;")

with open('final_migration.sql', 'w') as f:
    f.write('\n'.join(sql))
