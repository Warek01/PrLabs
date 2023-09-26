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
  html = requests.get(url).text

  soup = BeautifulSoup(html, 'html.parser')
  data = {
    'title': '',
    'photos': [],
    'region': '',
    'description': '',
    'prices': {},
    'features': {
    },
    'other features': [],
    'categories': [],
    'owner': {},
    'views': '',
    'type': '',
    'date': '',
    'phone': ''
  }

  title = soup.select_one('header.adPage__header')
  if title is not None:
    data['title'] = title.text.strip()

  photos = soup.select('#js-ad-photos img')
  if photos is not None:
    for photo in photos:
      data['photos'].append(photo.attrs['src'])

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
      value = li.select_one('[itemprop=value]')
      if value is not None:
        data['features'][key] = value.text.strip()
      else:
        data['other features'].append(key)

  categories = soup.select_one('#m__breadcrumbs')
  if categories is not None:
    for li in categories.select('li')[:-1]:
      data['categories'].append(li.text.strip())

  owner = soup.select_one('.adPage__aside__stats__owner__login')
  if owner is not None:
    data['owner']['name'] = owner.text.strip()
    data['owner']['url'] = BASE_URL + owner.attrs['href']

  data['views'] = soup.select_one('.adPage__aside__stats__views').text.split(':')[1].split('(')[0].strip()
  data['type'] = soup.select_one('.adPage__aside__stats__type').text.split(':')[1].strip()
  data['date'] = ':'.join(soup.select_one('.adPage__aside__stats__date').text.split(':')[1:]).strip()

  phone = soup.select_one('.adPage__content__phone')
  if phone is not None:
    data['phone'] = phone.select_one('a').attrs['href'].split(':')[1].strip()

  return data


data = request_data('https://999.md/ro/82823203')

with open('data.json', 'w') as file:
  file.write(json.dumps(data, indent=2, ensure_ascii=False))

# url_list = request_list('https://999.md/ro/list/transport/cars?page=638', max_page=1000, current_page=638)
#
# with open('file.txt', 'w') as file:
#   for url in url_list:
#     file.write(url + '\n')
