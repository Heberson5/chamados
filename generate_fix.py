import subprocess

def run_query(query):
    result = subprocess.run(['psql', '-t', '-A', '-c', query], capture_output=True, text=True)
    return result.stdout.strip()

# 1. Get all policy definitions
policies_query = """
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    pg_get_policydef(oid) as def
FROM pg_policies 
WHERE schemaname = 'public';
"""
policies = run_query(policies_query).split('\n')

sql = ["BEGIN;"]

# Drop all policies
for line in policies:
    if not line: continue
    parts = line.split('|')
    if len(parts) < 3: continue
    sql.append(f"DROP POLICY IF EXISTS \"{parts[2]}\" ON public.\"{parts[1]}\";")

# Drop FKs (previously identified)
fks_query = """
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint 
WHERE connamespace = 'public'::regnamespace AND contype = 'f';
"""
fks = run_query(fks_query).split('\n')
for line in fks:
    if not line: continue
    parts = line.split('|')
    sql.append(f"ALTER TABLE public.\"{parts[1]}\" DROP CONSTRAINT IF EXISTS \"{parts[0]}\";")

# Swap IDs
tables_query = "SELECT table_name FROM information_schema.columns WHERE column_name = 'id_numerico' AND table_schema = 'public';"
tables = [t for t in run_query(tables_query).split('\n') if t]

for table in tables:
    sql.append(f"ALTER TABLE public.\"{table}\" DROP CONSTRAINT IF EXISTS \"{table}_pkey\" CASCADE;")
    sql.append(f"ALTER TABLE public.\"{table}\" RENAME COLUMN id TO old_uuid_id;")
    sql.append(f"ALTER TABLE public.\"{table}\" RENAME COLUMN id_numerico TO id;")
    sql.append(f"ALTER TABLE public.\"{table}\" ADD PRIMARY KEY (id);")

# Update FK values and re-create FKs
# (I'll reuse the FK list from before but with safer quoting)
fks_detailed_query = """
SELECT
    conname,
    conrelid::regclass as table_name,
    a.attname as column_name,
    confrelid::regclass as foreign_table_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.connamespace = 'public'::regnamespace AND contype = 'f';
"""
fks_detailed = run_query(fks_detailed_query).split('\n')
for line in fks_detailed:
    if not line: continue
    parts = line.split('|')
    conname, table, col, ftable = parts
    if ftable in tables:
        sql.append(f"ALTER TABLE public.\"{table}\" ADD COLUMN IF NOT EXISTS \"{col}_new\" BIGINT;")
        sql.append(f"UPDATE public.\"{table}\" t SET \"{col}_new\" = r.id FROM public.\"{ftable}\" r WHERE t.\"{col}\" = r.old_uuid_id;")
        sql.append(f"ALTER TABLE public.\"{table}\" DROP COLUMN IF EXISTS \"{col}\";")
        sql.append(f"ALTER TABLE public.\"{table}\" RENAME COLUMN \"{col}_new\" TO \"{col}\";")
        sql.append(f"ALTER TABLE public.\"{table}\" ADD CONSTRAINT \"{conname}\" FOREIGN KEY (\"{col}\") REFERENCES public.\"{ftable}\"(id);")

# Re-create policies with transformed definitions
for line in policies:
    if not line: continue
    parts = line.split('|')
    definition = parts[3]
    
    # Transform definition
    new_def = definition.replace('id = auth.uid()', 'user_id = auth.uid()')
    new_def = new_def.replace('auth.uid() = id', 'auth.uid() = user_id')
    new_def = new_def.replace('usuario_id = auth.uid()', 'usuario_id = my_id()')
    new_def = new_def.replace('auth.uid() = usuario_id', 'my_id() = usuario_id')
    new_def = new_def.replace('tecnico_id = auth.uid()', 'tecnico_id = my_id()')
    
    # Ensure CREATE POLICY starts correctly
    if not new_def.startswith("CREATE POLICY"):
        # The pg_get_policydef might already include CREATE POLICY
        pass
    
    sql.append(new_def + ";")

sql.append("COMMIT;")

with open('final_fix.sql', 'w') as f:
    f.write('\n'.join(sql))
