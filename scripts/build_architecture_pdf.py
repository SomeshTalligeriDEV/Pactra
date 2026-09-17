#!/usr/bin/env python3
"""Build the source-reviewed Pactra document. Requires reportlab (see docs/README.md)."""
from pathlib import Path
import json
import re
from html import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'docs/architecture.json').read_text())
OUT = ROOT / 'docs/Pactra-System-Architecture-and-User-Workflows.pdf'
FONTS = Path('/System/Library/Fonts/Supplemental')
if (FONTS / 'Arial.ttf').exists():
    for name, file in [('Body','Arial.ttf'), ('Strong','Arial Bold.ttf')]:
        pdfmetrics.registerFont(TTFont(name, str(FONTS/file)))
else:
    pdfmetrics.registerFontFamily('Helvetica', normal='Helvetica', bold='Helvetica-Bold')
FONT = 'Body' if (FONTS/'Arial.ttf').exists() else 'Helvetica'
BOLD = 'Strong' if FONT == 'Body' else 'Helvetica-Bold'
INK = colors.HexColor('#142536')
MUTED = colors.HexColor('#546575')
TEAL = colors.HexColor('#007E80')
LIGHT = colors.HexColor('#EFF5F5')
RULE = colors.HexColor('#D9E2E8')
W, H = 595.276, 841.89
CW = W - 100
styles = {
    'body': ParagraphStyle('body', fontName=FONT, fontSize=9.4, leading=14.1, textColor=INK, spaceAfter=10),
    'small': ParagraphStyle('small', fontName=FONT, fontSize=8.2, leading=11.7, textColor=MUTED, spaceAfter=7),
    'title': ParagraphStyle('title', fontName=BOLD, fontSize=25, leading=29, textColor=INK, spaceAfter=16),
    'kicker': ParagraphStyle('kicker', fontName=BOLD, fontSize=8.4, leading=12, textColor=TEAL, spaceAfter=9),
    'h': ParagraphStyle('h', fontName=BOLD, fontSize=11.2, leading=15, textColor=INK, spaceBefore=6, spaceAfter=6, keepWithNext=True),
    'cell': ParagraphStyle('cell', fontName=FONT, fontSize=8.6, leading=12.2, textColor=INK),
    'thead': ParagraphStyle('thead', fontName=BOLD, fontSize=8.5, leading=11, textColor=colors.white),
}

def para(text, kind='body'):
    return Paragraph(escape(text), styles[kind])

class Diagram(Flowable):
    def __init__(self, kind):
        super().__init__()
        self.kind = kind
        self.width = CW
        self.height = {'context':245, 'purchase':232, 'deployment':182}[kind]

    def draw(self):
        c = self.canv
        def box(x,y,w,h,title,sub='',dark=False):
            c.setFillColor(INK if dark else LIGHT)
            c.setStrokeColor(INK if dark else RULE)
            c.roundRect(x,y,w,h,6,fill=1,stroke=1)
            p = Paragraph(escape(title), ParagraphStyle('dt',fontName=BOLD,fontSize=9,leading=11,textColor=colors.white if dark else INK,alignment=1))
            _,ph=p.wrap(w-12,h)
            p.drawOn(c,x+6,y+h-ph-10)
            if sub:
                p=Paragraph(escape(sub),ParagraphStyle('ds',fontName=FONT,fontSize=7.4,leading=10,textColor=colors.HexColor('#D9EEEE') if dark else MUTED,alignment=1))
                _,ph=p.wrap(w-12,h)
                p.drawOn(c,x+6,y+8)
        def arrow(x1,y1,x2,y2,label=None):
            from math import atan2,cos,sin,pi
            c.setStrokeColor(TEAL);c.setFillColor(TEAL);c.setLineWidth(1)
            c.line(x1,y1,x2,y2)
            a=atan2(y2-y1,x2-x1)
            path=c.beginPath();path.moveTo(x2,y2)
            path.lineTo(x2-5*cos(a-pi/6),y2-5*sin(a-pi/6))
            path.lineTo(x2-5*cos(a+pi/6),y2-5*sin(a+pi/6));path.close()
            c.drawPath(path,fill=1,stroke=0)
            if label:
                c.setFont(FONT,7);c.setFillColor(MUTED)
                c.drawCentredString((x1+x2)/2,(y1+y2)/2+5,label)
        if self.kind=='context':
            box(0,175,142,56,'Owner + wallet','Sign policy and owner actions')
            box(176,175,142,56,'Agent / orchestrator','URL, status, delegation')
            box(353,175,142,56,'Public reader','Site / console / evidence')
            box(176,91,142,56,'Pactra runtime','Daemon modules + integrations',True)
            box(353,91,142,56,'Read / seller services','Meter + attest + demo seller')
            box(0,7,236,54,'Arc contracts','Registry / vault / conduct + ERC-8004',True)
            box(271,7,224,54,'Payment ecosystem','Circle Gateway + x402 sellers')
            arrow(247,175,247,147)
            arrow(424,175,424,147)
            arrow(71,175,71,61)
            arrow(211,91,176,61)
            arrow(283,91,331,61)
            arrow(176,61,387,91)
        elif self.kind=='purchase':
            xs=[30,137,248,360,466]
            labels=['Agent','Runtime','Seller','TreeVault','Gateway']
            for x,label in zip(xs,labels):
                c.setFillColor(INK);c.setFont(BOLD,8.5);c.drawCentredString(x,219,label)
                c.setStrokeColor(RULE);c.setDash(2,3);c.line(x,210,x,10);c.setDash()
            for y,a,b,label in [(195,0,1,'URL'),(168,1,2,'Initial request'),(141,2,1,'402 offer'),(114,1,3,'draw(node, payee, amount)'),(87,3,4,'Deposit if accepted'),(60,1,4,'Settlement / funds'),(33,1,2,'Signed payment retry')]:
                arrow(xs[a],y,xs[b],y,label)
            c.setFillColor(MUTED);c.setFont(FONT,7.3)
            c.drawString(0,0,'Simplified accepted path; the separate refusal and release branches are described below.')
        else:
            box(0,86,218,80,'Operator environment','Agent / MCP / daemon :8402 / proxy :8403',True)
            box(268,86,227,80,'Public host: nginx + systemd','Static site + console; read API + sellers',True)
            box(268,6,227,54,'Loopback services','Meter :8404 / attest :8405 / demo :8406')
            box(0,6,218,54,'External Arc / payment services','RPC, USDC, registries, Gateway, sellers')
            arrow(109,86,109,60)
            arrow(381,86,381,60)
            arrow(268,33,218,33)

class Cover(Flowable):
    def __init__(self):
        super().__init__();self.width=CW;self.height=685
    def draw(self):
        c=self.canv
        c.setFillColor(TEAL);c.rect(0,638,56,5,fill=1,stroke=0)
        c.setFillColor(INK);c.setFont(BOLD,56);c.drawString(0,565,'Pactra')
        c.setFont(FONT,25);c.drawString(0,515,'System Architecture')
        c.drawString(0,479,'& User Workflows')
        p=para('One budget for a tree of agents, enforced on chain.')
        p.wrap(CW,80);p.drawOn(c,0,429)
        # Vector delegation tree: retained as document-native artwork.
        nodes=[(247,345),(107,269),(387,269),(37,193),(177,193),(317,193),(457,193)]
        c.setStrokeColor(RULE);c.setLineWidth(2)
        for a,b in [(0,1),(0,2),(1,3),(1,4),(2,5),(2,6)]:
            c.line(*nodes[a],*nodes[b])
        for i,(x,y) in enumerate(nodes):
            c.setFillColor(INK if i<3 else LIGHT);c.setStrokeColor(TEAL if i==6 else INK)
            c.circle(x,y,16 if i==0 else 12,fill=1,stroke=1)
        c.setStrokeColor(RULE);c.line(0,123,CW,123)
        for y,label,value in [(96,'PROJECT MAINTAINER','SomeshTalligeriDEV'),(68,'DOCUMENT CONTROL','Version 1.0  /  17 September 2026'),(40,'ASSESSMENT','Source-reviewed architecture; local rebrand')]:
            c.setFillColor(MUTED);c.setFont(BOLD,7.5);c.drawString(0,y,label)
            c.setFillColor(INK);c.setFont(FONT,9.5);c.drawString(145,y,value)

def table(headers, rows):
    n=len(headers)
    widths=([CW*.27,CW*.73] if n==2 else [CW*.18,CW*.32,CW*.50])
    if headers[0]=='Priority': widths=[CW*.115,CW*.505,CW*.38]
    data=[[para(x,'thead') for x in headers]]+[[para(x,'cell') for x in row] for row in rows]
    t=Table(data,colWidths=widths,hAlign='LEFT',repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),INK),('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,LIGHT]),
        ('LINEBELOW',(0,0),(-1,0),.5,INK),('LINEBELOW',(0,-1),(-1,-1),.5,RULE),
    ]))
    return t

class NumberedCanvas(canvas.Canvas):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs);self.states=[]
    def showPage(self):
        self.states.append(dict(self.__dict__));self._startPage()
    def save(self):
        total=len(self.states)
        for state in self.states:
            self.__dict__.update(state)
            self.setFillColor(MUTED);self.setFont(FONT,8)
            self.drawString(50,31,'PACTRA  /  Architecture & User Workflows')
            self.drawRightString(W-50,31,f'{self._pageNumber:02d} / {total:02d}')
            self.setStrokeColor(RULE);self.line(50,46,W-50,46)
            if self._pageNumber>1:
                self.setFont(FONT,7.5)
                self.drawString(50,H-31,'SomeshTalligeriDEV')
                self.drawRightString(W-50,H-31,'SOURCE REVIEW  •  17 SEP 2026')
            super().showPage()
        super().save()

flow=[Cover(),PageBreak()]
markdown=['# Pactra — System Architecture & User Workflows','',f'Maintainer: {DATA["owner"]} | Version {DATA["version"]} | {DATA["date"]}','']
validation_file=ROOT/'docs/validation.json'
validation=json.loads(validation_file.read_text()) if validation_file.exists() else {'rows':[['Verification','In progress; see validation.json for final evidence.']]}
for i,page in enumerate(DATA['pages']):
    flow += [para(page['kicker'],'kicker'),para(page['title'],'title')]
    markdown += ['## '+page['kicker']+' — '+page['title'],'']
    if page.get('diagram'):
        flow += [Diagram(page['diagram']),Spacer(1,13)]
        markdown += ['*Vector diagram available in the PDF: '+page['diagram']+'.*','']
    for block in page['blocks']:
        kind=block['type']
        if kind=='table' or kind=='validation':
            headers=block.get('headers',['Check','Result'])
            rows=block.get('rows',validation['rows'])
            flow += [table(headers,rows),Spacer(1,11)]
            markdown += ['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']
            markdown += ['| '+' | '.join(row)+' |' for row in rows]+['']
        elif kind=='callout':
            t=Table([[para(block['text'])]],colWidths=[CW])
            t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),LIGHT),('LINEBEFORE',(0,0),(0,-1),3,TEAL),('LEFTPADDING',(0,0),(-1,-1),13),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),11),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
            flow += [t,Spacer(1,10)]
            markdown += ['> '+block['text'],'']
        else:
            flow.append(para(block['text'],'h' if kind=='h' else 'body'))
            markdown += [('### ' if kind=='h' else '')+block['text'],'']
    if i<len(DATA['pages'])-1: flow.append(PageBreak())
doc=SimpleDocTemplate(str(OUT),pagesize=(W,H),rightMargin=50,leftMargin=50,topMargin=63,bottomMargin=61,title=DATA['title']+' — '+DATA['subtitle'],author=DATA['owner'],subject='Pactra source-reviewed system architecture, user journeys, deployment and limitations')
doc.build(flow,canvasmaker=NumberedCanvas)
# Add a navigable outline when PyMuPDF is installed; PDF generation itself
# depends only on ReportLab.
try:
    import fitz
    pdf = fitz.open(OUT)
    toc = [[1, 'Pactra — Architecture & Workflows', 1]]
    for page_no, pdf_page in enumerate(pdf, start=1):
        page_text = pdf_page.get_text()
        for section in DATA['pages']:
            if section['kicker'] in page_text:
                toc.append([1, section['kicker'].split(' / ')[0] + '  ' + section['title'], page_no])
    pdf.set_toc(toc)
    temporary = OUT.with_suffix('.bookmarked.pdf')
    pdf.save(temporary, garbage=4, deflate=True)
    pdf.close()
    temporary.replace(OUT)
except ImportError:
    pass
(ROOT/'docs/Pactra-System-Architecture-and-User-Workflows.md').write_text('\n'.join(markdown))
print(OUT)
