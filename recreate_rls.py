import subprocess

def run_query(query):
    result = subprocess.run(['psql', '-t', '-A', '-c', query], capture_output=True, text=True)
    return result.stdout.strip()

policies_query = "SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public';"
policies_raw = run_query(policies_query).split('\n')

sql = []
for line in policies_raw:
    if not line: continue
    parts = line.split('|')
    if len(parts) < 5: continue
    table, name, cmd, qual, with_check = parts
    
    # Drop existing
    sql.append(f"DROP POLICY IF EXISTS {name} ON public.{table};")
    
    # Transform policy logic
    new_qual = qual.replace('profiles.id = auth.uid()', 'profiles.user_id = auth.uid()')
    new_qual = new_qual.replace('p.id = auth.uid()', 'p.user_id = auth.uid()')
    new_qual = new_qual.replace('id = auth.uid()', 'user_id = auth.uid()')
    new_qual = new_qual.replace('auth.uid() = id', 'auth.uid() = user_id')
    
    new_with_check = with_check.replace('id = auth.uid()', 'user_id = auth.uid()')
    new_with_check = new_with_check.replace('auth.uid() = id', 'auth.uid() = user_id')

    # Also handle usuario_id comparisons
    # If a table has usuario_id (bigint), and it's compared to auth.uid() (uuid), it will fail.
    # We should use (usuario_id = my_id())
    new_qual = new_qual.replace('usuario_id = auth.uid()', 'usuario_id = my_id()')
    new_qual = new_qual.replace('auth.uid() = usuario_id', 'my_id() = usuario_id')
    new_with_check = new_with_check.replace('usuario_id = auth.uid()', 'usuario_id = my_id()')
    
    cmd_part = f"FOR {cmd}" if cmd != 'ALL' else ""
    using_part = f"USING ({new_qual})" if new_qual and new_qual != '<nil>' else ""
    with_check_part = f"WITH CHECK ({new_with_check})" if new_with_check and new_with_check != '<nil>' else ""
    
    sql.append(f"CREATE POLICY {name} ON public.{table} {cmd_part} {using_part} {with_check_part};")

with open('recreate_rls.sql', 'w') as f:
    f.write('\n'.join(sql))
