import subprocess

def run_query(query):
    result = subprocess.run(['psql', '-t', '-A', '-c', query], capture_output=True, text=True)
    return result.stdout.strip()

policies_query = """
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';
"""
policies_raw = run_query(policies_query).split('\n')

sql = []
for line in policies_raw:
    if not line: continue
    parts = line.split('|')
    if len(parts) < 5: continue
    table, name, cmd, qual, with_check = parts
    
    new_qual = qual.replace('id = auth.uid()', 'user_id = auth.uid()').replace('auth.uid() = id', 'auth.uid() = user_id')
    new_with_check = with_check.replace('id = auth.uid()', 'user_id = auth.uid()').replace('auth.uid() = id', 'auth.uid() = user_id')
    
    if new_qual != qual or new_with_check != with_check:
        sql.append(f"DROP POLICY IF EXISTS {name} ON public.{table};")
        cmd_part = f"FOR {cmd}" if cmd != 'ALL' else ""
        using_part = f"USING ({new_qual})" if new_qual and new_qual != '<nil>' else ""
        with_check_part = f"WITH CHECK ({new_with_check})" if new_with_check and new_with_check != '<nil>' else ""
        sql.append(f"CREATE POLICY {name} ON public.{table} {cmd_part} {using_part} {with_check_part};")

with open('fix_rls.sql', 'w') as f:
    f.write('\n'.join(sql))
