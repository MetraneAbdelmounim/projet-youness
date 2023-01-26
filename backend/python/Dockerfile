FROM python:3.9.12

WORKDIR /python-docker

COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY . .

CMD [ "python3", "-m" , "flask","--debug", "run", "--host=0.0.0.0","--port=8000"]