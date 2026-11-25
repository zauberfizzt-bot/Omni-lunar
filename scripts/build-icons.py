from PIL import Image
from pathlib import Path
import hashlib
p=Path('icon-192.png')
assert hashlib.sha256(p.read_bytes()).hexdigest()=='e92684bafc79c15c9223cdd713e64d9ee871f43e378a28d4130440a5eecfb97c'
im=Image.open(p).convert('RGB')
im.resize((512,512),Image.Resampling.LANCZOS).save('icon-512.png')
mask=Image.new('RGB',(512,512),im.getpixel((0,0)))
mask.paste(im.resize((380,380),Image.Resampling.LANCZOS),(66,66))
mask.save('icon-maskable.png')
import base64
Path('icon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><image width="192" height="192" href="data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()+'"/></svg>')
