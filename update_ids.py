import json
import subprocess

def run_query(query):
    result = subprocess.run(['psql', '-t', '-A', '-c', query], capture_output=True, text=True)
    return result.stdout.strip()

# Get all tables with id_numerico and their PK/FK relationships
tables_query = """
SELECT DISTINCT table_name 
FROM information_schema.columns 
WHERE column_name = 'id_numerico' AND table_schema = 'public';
"""
tables = run_query(tables_query).split('\n')

# Get all foreign keys
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
    if '|' in line:
        parts = line.split('|')
    else:
        parts = line.split('\t')
    if len(parts) >= 5:
        fks.append({
            'constraint_name': parts[0],
            'table_name': parts[1],
            'column_name': parts[2],
            'foreign_table_name': parts[3],
            'foreign_column_name': parts[4]
        })

sql = []

# 1. Preparation: For profiles, we need to keep the UUID as user_id
sql.append("-- Prepare profiles")
sql.append("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;")
sql.append("UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;")
sql.append("ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;")
sql.append("ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);")

# 2. Update RLS policies for profiles
sql.append("-- Update RLS for profiles")
sql.append("DO $$ BEGIN")
sql.append("  EXECUTE (SELECT 'ALTER POLICY ' || quote_ident(policyname) || ' ON public.profiles USING (auth.uid() = user_id)'")
sql.append("           FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' AND (qual LIKE '%(auth.uid() = id)%' OR qual LIKE '%(id = auth.uid())%'));")
sql.append("EXCEPTION WHEN OTHERS THEN END $$;")

# 3. For each table, perform the switch
for table in tables:
    if not table: continue
    sql.append(f"\n-- Processing table: {table}")
    
    # Identify FKs pointing to this table
    pointing_fks = [fk for fk in fks if fk['foreign_table_name'] == table and fk['foreign_column_name'] == 'id']
    
    # Drop constraints pointing to this table
    for fk in pointing_fks:
        sql.append(f"ALTER TABLE public.{fk['table_name']} DROP CONSTRAINT IF EXISTS {fk['constraint_name']};")
    
    # Drop this table's PK
    sql.append(f"ALTER TABLE public.{table} DROP CONSTRAINT IF EXISTS {table}_pkey CASCADE;")
    
    # Rename id to uuid (if it was uuid)
    # Check if id is uuid
    data_type = run_query(f"SELECT data_type FROM information_schema.columns WHERE table_name = '{table}' AND column_name = 'id'").strip()
    if data_type == 'uuid':
        sql.append(f"ALTER TABLE public.{table} RENAME COLUMN id TO old_uuid_id;")
    else:
        sql.append(f"ALTER TABLE public.{table} RENAME COLUMN id TO old_id;")
    
    # Rename id_numerico to id
    sql.append(f"ALTER TABLE public.{table} RENAME COLUMN id_numerico TO id;")
    
    # Make it PK
    sql.append(f"ALTER TABLE public.{table} ADD PRIMARY KEY (id);")
    
    # Update referencing tables
    for fk in pointing_fks:
        ref_table = fk['table_name']
        ref_col = fk['column_name']
        sql.append(f"-- Updating FK {ref_col} in {ref_table}")
        sql.append(f"ALTER TABLE public.{ref_table} ADD COLUMN IF NOT EXISTS {ref_col}_new BIGINT;")
        sql.append(f"UPDATE public.{ref_table} t SET {ref_col}_new = r.id FROM public.{table} r WHERE t.{ref_col} = r.old_uuid_id;")
        sql.append(f"ALTER TABLE public.{ref_table} DROP COLUMN IF EXISTS {ref_col};")
        sql.append(f"ALTER TABLE public.{ref_table} RENAME COLUMN {ref_col}_new TO {ref_col};")
        sql.append(f"ALTER TABLE public.{ref_table} ADD CONSTRAINT {fk['constraint_name']} FOREIGN KEY ({ref_col}) REFERENCES public.{table}(id);")

# Final Cleanup
sql.append("\n-- Cleanup: Drop old_uuid_id columns")
for table in tables:
    if not table: continue
    sql.append(f"ALTER TABLE public.{table} DROP COLUMN IF EXISTS old_uuid_id;")
    sql.append(f"ALTER TABLE public.{table} DROP COLUMN IF EXISTS old_id;")

with open('migration.sql', 'w') as f:
    f.write('\n'.join(sql))
