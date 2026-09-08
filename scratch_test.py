import urllib.request
import re

url = "http://www.ce.yildiz.edu.tr"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        links = re.findall(r'href=["\'](.*?)["\']', html)
        print('Found total links:', len(links))
        pdf_links = [l for l in links if 'pdf' in l.lower() or 'ders' in l.lower()]
        print('Matching links:', pdf_links[:10])
except Exception as e:
    print('Error:', e)
