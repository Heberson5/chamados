import subprocess

def run_query(query):
    result = subprocess.run(['psql', '-t', '-A', '-c', query], capture_output=True, text=True)
    return result.stdout.strip()

tables_query = "SELECT table_name FROM information_schema.columns WHERE column_name = 'id_numerico' AND table_schema = 'public';"
tables = [t for t in run_query(tables_query).split('\n') if t]

sql = ["BEGIN;"]
sql.append("SET CONSTRAINTS ALL DEFERRED;")

for table in tables:
    sql.append(f"-- Swapping ID for {table}")
    sql.append(f"ALTER TABLE public.\"{table}\" DROP CONSTRAINT IF EXISTS \"{table}_pkey\" CASCADE;")
    sql.append(f"ALTER TABLE public.\"{table}\" RENAME COLUMN id TO old_uuid_id;")
    sql.append(f"ALTER TABLE public.\"{table}\" RENAME COLUMN id_numerico TO id;")
    sql.append(f"ALTER TABLE public.\"{table}\" ADD PRIMARY KEY (id);")

# Special case for profiles RLS
sql.append("DROP POLICY IF EXISTS profiles_self_all ON public.profiles;")
sql.append("CREATE POLICY profiles_self_all ON public.profiles USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());")

sql.append("COMMIT;")

with open('simple_swap.sql', 'w') as f:
    f.write('\n'.join(sql))
