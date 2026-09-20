"""Render the narrated walkthrough from verified browser captures.
Requires Pillow, ffmpeg/ffprobe, and macOS say. No network services are used.
"""
import json, os, re, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent
TMP=Path(tempfile.mkdtemp(prefix='pactra-video-'))
SCENES=json.loads((ROOT/'scenes.json').read_text())
SHOTS=json.loads((ROOT/'media/captures.json').read_text())
FONT=Path(os.environ.get('PACTRA_DEMO_FONT_DIR','/System/Library/Fonts/Supplemental'))
def font(size,bold=False):return ImageFont.truetype(str(FONT/('Arial Bold.ttf' if bold else 'Arial.ttf')),size)
def run(args):subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
def text(d,xy,s,size=28,color='#f3f4f7',bold=False):d.text(xy,s,font=font(size,bold),fill=color)
def frame(scene,index,shot=None):
 im=Image.new('RGB',(1920,1080),'#10141f');d=ImageDraw.Draw(im)
 for y in range(1080):
  shade=int(8*(1-y/1080));d.line((0,y,1920,y),fill=(16+shade,20+shade,31+shade))
 text(d,(100,40),scene['label'],22,'#c7b6ef',True)
 text(d,(100,79),scene['heading'],48,bold=True)
 if shot:
  d.rounded_rectangle((156,158,1764,997),radius=14,fill='#303745')
  for x,c in zip([181,204,227],['#e09b98','#dbcb8d','#9bc1ad']):d.ellipse((x,172,x+11,183),fill=c)
  text(d,(260,166),'Pactra  /  '+('Product interface' if scene['id'] in ['intro','paid','mcp'] else 'Local contract demonstration'),18,'#dadde6')
  screen=Image.open(ROOT/'media'/shot).convert('RGB'); scale=min(1600/screen.width,800/screen.height); screen=screen.resize((round(screen.width*scale),round(screen.height*scale)),Image.Resampling.LANCZOS)
  # Preserve the actual screenshot aspect ratio; never stretch product UI.
  d.rectangle((160,194,1760,994),fill='#eeede9')
  im.paste(screen,(160+(1600-screen.width)//2,194+(800-screen.height)//2))
 elif scene['id']=='evidence':
  text(d,(120,185),'Loop spending across three repetitions',32,'#ccd1dd')
  rows=[('Pactra',9.18,'3 / 3 complete','#bba2ec'),('Independent wallets',27.54,'3 / 3 complete','#8194af'),('Shared cap',56.61,'0 / 3 complete','#ac7485')]
  for i,(label,value,completion,color) in enumerate(rows):
   y=290+i*175;text(d,(120,y),label,34,bold=True);text(d,(1450,y),completion,29)
   d.rounded_rectangle((120,y+60,120+value/56.61*1210,y+110),radius=8,fill=color)
   text(d,(140+value/56.61*1210,y+62),f'${value:.2f}',30,bold=True)
  text(d,(120,875),'Same scripted task · Local Anvil · Mock settlement',30,'#c8cbd5')
  text(d,(120,932),'Source: research/results/g7-eval-2026-09-18.txt',25,'#a6adbd')
 else:
  text(d,(120,225),'Bounded autonomy.',82,bold=True)
  text(d,(120,322),'Observable failures.',82,bold=True)
  text(d,(120,419),'Reproducible evidence.',82,'#c7b6ef',True)
  text(d,(124,570),'Solidity  /  TypeScript  /  React  /  MCP  /  x402',33,'#ced3df')
  text(d,(124,640),'101 archived contract cases  ·  10 evaluation tests passed',31)
  text(d,(124,718),'Prototype · Trusted owner and runtime · No formal verification',27,'#aeb7c8')
  text(d,(124,843),'Explore the repository',28,'#c7b6ef',True)
  text(d,(124,899),'github.com/SomeshTalligeriDEV/Pactra',40,bold=True)
 text(d,(100,1030),'Somesh.S.Talligeri  ·  Pactra',21,'#b9c0ce')
 text(d,(1430,1030),f'{index+1:02d} / {len(SCENES):02d}    AI BUILDER DEMO',21,'#b9c0ce')
 return im

def stamp(seconds):
 ms=round(seconds*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'
segments=[];srt=[];timing=[];offset=0;cue=1
for index,s in enumerate(SCENES):
 source=TMP/(s['id']+'.txt');source.write_text(s['text'])
 audio=TMP/(s['id']+'.aiff');run(['say','-v','Samantha','-r','196','-f',str(source),'-o',str(audio)])
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(audio)]))
 total=round(duration+1.2,2)
 shots=SHOTS.get(s['id'],[None]);lines=[]
 for i,shot in enumerate(shots):
  picture=TMP/f'{index}-{i}.png';im=frame(s,index,shot);im.save(picture)
  if i==0:im.save(ROOT/'media'/f'frame-{s["id"]}.jpg',quality=88)
  lines.extend([f"file '{picture}'",f'duration {total/len(shots):.6f}'])
 lines.append(f"file '{picture}'");listing=TMP/(s['id']+'.txt');listing.write_text('\n'.join(lines)+'\n')
 segment=TMP/(s['id']+'.mp4')
 run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(listing),'-i',str(audio),'-vf','fps=24,format=yuv420p,fade=t=in:st=0:d=0.2','-af','apad','-t',str(total),'-c:v','libx264','-preset','veryfast','-crf','21','-c:a','aac','-b:a','128k','-ar','48000',str(segment)])
 segments.append(segment)
 # Sentence-aligned approximate captions, timed within each narration segment.
 sentences=re.split(r'(?<=[.!?])\s+',s['text']);words=sum(len(t.split()) for t in sentences);elapsed=0
 import textwrap
 for sentence in sentences:
  end=elapsed+duration*len(sentence.split())/words
  srt.append(f'{cue}\n{stamp(offset+elapsed)} --> {stamp(offset+end)}\n'+ '\n'.join(textwrap.wrap(sentence,width=78))+'\n');cue+=1;elapsed=end
 timing.append({'scene':s['id'],'startSeconds':round(offset,2),'durationSeconds':total});offset+=total
 print(f'Rendered {s["id"]}: {total:.2f}s',flush=True)
listing=TMP/'segments.txt';listing.write_text('\n'.join(f"file '{s}'" for s in segments)+'\n')
output=ROOT/'pactra-razorpay-demo.mp4'
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart','-metadata','title=Pactra — AI Builder Demo','-metadata','artist=Somesh.S.Talligeri',str(output)])
(ROOT/'pactra-razorpay-demo.srt').write_text('\n'.join(srt))
captioned=TMP/'captioned.mp4'
run(['ffmpeg','-y','-v','error','-i',str(output),'-i',str(ROOT/'pactra-razorpay-demo.srt'),'-map','0:v:0','-map','0:a:0','-map','1:0','-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata:s:s:0','language=eng','-movflags','+faststart',str(captioned)])
import shutil
shutil.copyfile(captioned,output)
(ROOT/'timing.json').write_text(json.dumps(timing,indent=2)+'\n')
frame(SCENES[-1],len(SCENES)-1).resize((1280,720),Image.Resampling.LANCZOS).save(ROOT/'thumbnail.jpg',quality=93)
print(f'FINAL: {output.name}, {offset:.2f}s, {output.stat().st_size} bytes',flush=True)
