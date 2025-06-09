FROM python:3.9.12

WORKDIR /python

COPY python/requirements.txt requirements.txt
RUN pip3 install -r requirements.txt
RUN apt-get update && apt-get install -y iputils-ping
RUN playwright install 
RUN  playwright install-deps
COPY . .
EXPOSE 8000
ENV FLASK_APP=python/app.py
CMD [ "python3", "-m" , "flask", "run", "--host=0.0.0.0", "--port=8000"]
