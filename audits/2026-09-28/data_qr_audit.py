"""Read-only XLSX / QR / frontend consistency audit. No workbook saves."""
import base64, collections, io, json, re, sys
from pathlib import Path
from html.parser import HTMLParser
import openpyxl
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backups/audit-2026-09-28/python-deps'))
import zxingcpp

class Labels(HTMLParser):
    def __init__(self):
        super().__init__(); self.images=[]; self.codes=[]; self.in_code=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='img': self.images.append(a)
        if tag=='div' and a.get('class')=='qr-code-text': self.in_code=True
    def handle_data(self,data):
        if self.in_code: self.codes.append(data.strip()); self.in_code=False

html=(ROOT/'index.html').read_text(encoding='utf-8')
eq=json.loads(re.search(r'const EQUIPMENT\s*=\s*(\{.*?\});',html,re.S)[1])
p=Labels();p.feed((ROOT/'QR_Labels_Print.html').read_text(encoding='utf-8'))
qr_results=[]
for i,item in enumerate(p.images):
    raw=base64.b64decode(item['src'].split(',',1)[1]); img=Image.open(io.BytesIO(raw))
    result=zxingcpp.read_barcode(img)
    text=result.text if result else None
    expected='https://phamtiendat-135.github.io/HMO-equipment/?id='+item['alt']
    small=zxingcpp.read_barcode(img.resize((80,80)))
    qr_results.append({'alt':item['alt'],'printed':p.codes[i] if i<len(p.codes) else None,'decoded':text,'size':img.size,'matches':text==expected,'in_frontend':item['alt'] in eq,'decodes_at_css_80px':bool(small and small.text==text)})
print(json.dumps({'frontend_count':len(eq),'frontend_quantity':sum(v.get('qty',1) for v in eq.values()),'duplicate_html_equal':html==(ROOT/'QR_Landing_Page.html').read_text(encoding='utf-8'),'missing_manager':[k for k,v in eq.items() if not v.get('manager') or 'chưa phân công' in v.get('manager','').lower()], 'qr_labels':len(qr_results),'unique_qr':len(set(x['alt'] for x in qr_results)),'qr_decode_match':sum(x['matches'] for x in qr_results),'qr_failures':[x for x in qr_results if not x['matches'] or x['alt']!=x['printed'] or not x['in_frontend']],'qr_80px_decode':sum(x['decodes_at_css_80px'] for x in qr_results),'without_physical_labels':[k for k in eq if k not in {x['alt'] for x in qr_results}]},ensure_ascii=False,indent=2))
label_codes={x['alt'] for x in qr_results}
print(json.dumps({'missing_label_status_counts':dict(collections.Counter(v['status'] for k,v in eq.items() if k not in label_codes)),'software_labels':[k for k in label_codes if eq[k]['cat_code']=='SW']},ensure_ascii=False))
for filename in sys.argv[1:] or [str(ROOT/'HMO_Master_Equipment_Database.xlsx')]:
    wb=openpyxl.load_workbook(filename,data_only=False,read_only=False)
    report={'file':Path(filename).name,'sheets':[]}
    for ws in wb:
        rows=list(ws.values)
        nonempty=[(i+1,r) for i,r in enumerate(rows) if any(v is not None for v in r)]
        formulas=[{'cell':c.coordinate,'formula':c.value} for row in ws for c in row if c.data_type=='f']
        errors=[{'cell':c.coordinate,'error':c.value} for row in ws for c in row if c.data_type=='e']
        report['sheets'].append({'name':ws.title,'dimension':ws.calculate_dimension(),'nonempty_rows':len(nonempty),'headers':list(rows[0]) if rows else [],'formula_count':len(formulas),'formula_sample':formulas[:4]+formulas[-2:],'errors':errors,'protected':ws.protection.sheet,'validation_count':len(ws.data_validations.dataValidation)})
    ws=wb['Master_Data']; data=list(ws.values); headers=data[0]; records=[dict(zip(headers,row)) for row in data[1:] if row[headers.index('Mã QR')]]
    codes=[str(r['Mã QR']).strip() for r in records]
    compare={'name':'Tên thiết bị','manager':'CB quản lý hiện tại','qty':'Số lượng','status':'Tình trạng thực tế (01/2025)','location':'Địa điểm (chuẩn)','spec':'Thông số kỹ thuật','year':'Năm SĐ','origin':'Nước SX'}
    mismatches=[]
    for r in records:
        qr=str(r['Mã QR']).strip()
        for key,col in compare.items():
            left,right=r.get(col),eq.get(qr,{}).get(key)
            equal = (float(left or 0)==float(right or 0)) if key in ('qty','year') else str(left or '').strip()==str(right or '').strip()
            if col in headers and qr in eq and not equal:
                # Report coordinates and mismatching fields, not personal values.
                mismatches.append({'qr':qr,'field':key,'master_cell':f'{openpyxl.utils.get_column_letter(headers.index(col)+1)}{codes.index(qr)+2}'})
    report['master']={'records':len(records),'duplicates':[k for k,c in collections.Counter(codes).items() if c>1],'missing_from_frontend':sorted(set(codes)-eq.keys()),'frontend_extra':sorted(eq.keys()-set(codes)),'mismatches':mismatches,'blank_managers':[r['Mã QR'] for r in records if not r.get('CB quản lý hiện tại')],'status_counts':dict(collections.Counter(r.get('Tình trạng thực tế (01/2025)') for r in records))}
    report['stats_static_rows']=[(i+1,list(r)) for i,r in enumerate(wb['Thong_Ke'].values) if any(v is not None for v in r)]
    logrows=list(wb['Log_Muon_Tra'].values)
    report['log_checks']={'business_rows':sum(bool(r[0]) for r in logrows[1:]),'blank_headers':['O1','P1'] if len(logrows[0])>=16 and not logrows[0][14] and not logrows[0][15] else [],'records':[{'row':i+2,'qr':r[0],'borrow_date':r[6],'due_date':r[7],'return_date':r[8],'approval_recorded':bool(r[12]),'email_present':len(r)>15 and bool(r[15]),'hours':r[16] if len(r)>16 else None} for i,r in enumerate(logrows[1:]) if r[0]]}
    cb=list(wb['Can_Bo_QL'].values)
    report['manager_contacts']=[{'row':i+2,'name_present':bool(r[0]),'role':r[2],'email_present':bool(r[3]),'phone_present':bool(r[4])} for i,r in enumerate(cb[1:])]
    print(json.dumps(report,ensure_ascii=False,indent=2,default=str));wb.close()
