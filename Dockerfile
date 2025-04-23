FROM ubuntu:20.04

RUN apt update && apt install -y curl
RUN apt-get install xvfb -y


WORKDIR /app
COPY . /app


ARG DEBIAN_FRONTEND=noninteractive
RUN apt install gnupg -y
RUN curl -sS -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add
RUN echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list
RUN apt-get -y update
RUN apt-get -y install google-chrome-stable

EXPOSE 3000

RUN rm .env

RUN chmod +x /app/myapp
CMD ["/app/myapp"]
# C:/Users/kosmix/PrismaExpressAuthjsWs/.env