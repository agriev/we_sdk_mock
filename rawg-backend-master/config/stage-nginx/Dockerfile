FROM nginx:1.11.12

EXPOSE 80

RUN apt-get update -qqy && apt-get -qqy install curl runit wget unzip && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/*

RUN wget https://releases.hashicorp.com/consul-template/0.19.3/consul-template_0.19.3_linux_amd64.zip && \
    unzip -d /usr/local/bin consul-template_0.19.3_linux_amd64.zip && \
    rm -rf consul-template_0.19.3_linux_amd64.zip

RUN mkdir /logs
RUN mkdir /app
COPY config/stage-nginx/nginx.conf /etc/nginx/
COPY config/stage-nginx/resize.conf /etc/nginx/sites-enabled/

RUN mkdir /etc/consul-templates
COPY config/stage-nginx/project.conf.ctmpl /etc/consul-templates

COPY config/stage-nginx/nginx.service /etc/service/nginx/run
COPY config/stage-nginx/consul-template.service /etc/service/consul-template/run
RUN chmod +x /etc/service/nginx/run && chmod +x /etc/service/consul-template/run

CMD ["/usr/bin/runsvdir", "/etc/service"]
