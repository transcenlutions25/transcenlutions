import json,sqlite3,uuid,datetime
from pathlib import Path
DB=Path(__file__).resolve().parents[1]/'opportunities.sqlite3'
STAGES=['CAPTURED','RESEARCHING','VALIDATING','APPROVED','PROTOTYPE','MVP','PRIVATE ALPHA','PAID PILOT','LAUNCHED','SCALING','PAUSED','REJECTED','ARCHIVED','MERGED']
FIELDS='source,problem,target_customer,pain_severity,current_alternatives,proposed_solution,unique_advantage,willingness_to_pay,market,competition,build_difficulty,time_to_mvp,time_to_first_revenue,capital_required,regulatory_risk,dependencies,reusable_transcenlutions_technology,synergy_with_tay,defensibility,recurring_revenue_potential,estimated_margin,founder_advantage,evidence'.split(',')
def connect():
    c=sqlite3.connect(DB);c.execute('CREATE TABLE IF NOT EXISTS opportunities (id TEXT PRIMARY KEY,title TEXT,stage TEXT,details TEXT,created TEXT)');return c
def listing():
    with connect() as c:
        return [{'id':a,'title':b,'stage':d,'details':json.loads(e),'created':f} for a,b,d,e,f in c.execute('SELECT * FROM opportunities ORDER BY created DESC')]
def capture(data):
    title=data.get('title','').strip()
    if not title:raise ValueError('Give the opportunity a title.')
    details={k: data.get(k) or None for k in FIELDS}
    ident=uuid.uuid4().hex
    with connect() as c:c.execute('INSERT INTO opportunities VALUES(?,?,?,?,?)',(ident,title,'CAPTURED',json.dumps(details),datetime.datetime.now(datetime.timezone.utc).isoformat()))
    return ident
def update(data):
    if data['stage'] not in STAGES:raise ValueError('Invalid stage.')
    with connect() as c:
        row=c.execute('SELECT details FROM opportunities WHERE id=?',(data['id'],)).fetchone()
        if not row:raise ValueError('Opportunity not found.')
        details=json.loads(row[0]);details.update({k:v for k,v in data.get('details',{}).items() if k in FIELDS})
        c.execute('UPDATE opportunities SET stage=?,details=? WHERE id=?',(data['stage'],json.dumps(details),data['id']))
