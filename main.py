from bs4 import BeautifulSoup
import requests
import json
import re

BASE_URL = 'https://999.md'


def request_list(url: str, url_list: list[str] = [], max_page: int = 5, current_page=0) -> list[str]:
  if current_page == max_page:
    return url_list

  html = requests.get(url).text
  soup = BeautifulSoup(html, 'html.parser')
  anchors = soup.select('.ads-list-photo a.js-item-ad')
  anchors_set = set()
  paginator = soup.select_one('nav.paginator')

  last_li = paginator.select('li')[-1]
  has_next = paginator.select_one('li.is-next-page')
  has_last = paginator.select_one('li.is-last-page')

  if has_last is None and has_next is None and last_li.has_attr('class') and 'current' in last_li.attrs['class']:
    print(f'Reached the end page: {current_page}')
    return url_list

  for anchor in anchors:
    href = anchor.attrs['href']
    if href.startswith('/booster/'):
      continue
    anchors_set.add(BASE_URL + href)

  for a in anchors_set:
    url_list.append(a)

  return request_list(
    f'https://999.md/ro/list/transport/cars?page={current_page + 1}',
    url_list,
    max_page,
    current_page + 1
  )


def request_data(url: str) -> dict:
  # html = requests.get(url).text
  html = None

  with open('html.html', 'r') as file:
    html = file.read()

  soup = BeautifulSoup(html, 'html.parser')
  data = {
    'title': soup.select_one('header.adPage__header').text.strip(),
    'photos': [photo.attrs['src'] for photo in soup.select('#js-ad-photos img')],
    'region': '',
    'description': '',
    'prices': {},
    'features': {}
  }

  description = soup.select_one('div.adPage__content__description')
  if description is not None:
    data['description'] = description.text.strip()

  for price in soup.select('ul.adPage__content__price-feature__prices li'):
    text = price.text.strip()
    currency = 'lei'

    if '$' in text:
      currency = 'dollars'
    elif '€' in text:
      currency = 'euros'
    elif 'lei' in text:
      currency = 'lei'

    data['prices'][currency] = ' '.join(re.findall(r'\d+', text))

  region = soup.select_one('dl.adPage__content__region')
  if region is not None:
      data['region'] = ''.join([part.text.strip() for part in region.select('dd')])

  features = soup.select('.adPage__content__features__col ul')
  if features is not None:
    li_list = []
    for feature_list in features:
      [li_list.append(li) for li in feature_list.select('li')]

    for li in li_list:
      key = li.select_one('[itemprop=name]').text.strip()
      value = li.select_one('[itemprop=value]').text.strip()
      data['features'][key] = value


  return data


data = request_data('https://999.md/ro/84070407')

with open('data.json', 'w') as file:
  file.write(json.dumps(data, indent=2, ensure_ascii=False))

# url_list = request_list('https://999.md/ro/list/transport/cars?page=638', max_page=1000, current_page=638)
#
# with open('file.txt', 'w') as file:
#   for url in url_list:
#     file.write(url + '\n')
