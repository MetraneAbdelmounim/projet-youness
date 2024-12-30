FROM python:3.8-slim-buster

WORKDIR /python

COPY python/requirements.txt requirements.txt
RUN pip3 install -r requirements.txt
RUN apt-get update && apt-get install -y iputils-ping
COPY . .
EXPOSE 8000
ENV FLASK_APP=python/app.py
CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0", "--port=8000"]
