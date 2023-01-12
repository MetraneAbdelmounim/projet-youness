from bs4 import BeautifulSoup

import pandas as pd
from openpyxl import load_workbook
dict={}

html_source = open("test.html")

soup = BeautifulSoup(html_source, 'html.parser')

forms_all = soup.find_all("form")

for form in forms_all:
    inputs_form = form.find_all('input')
    if len(inputs_form)>=2:
        dict[inputs_form[0]['value']]=inputs_form[1]['value']



df = pd.DataFrame(data=dict, index=[1])
df.to_excel("test.xlsx", index=True)
