FROM nginx:latest

ARG HTPASSWD

RUN apt-get update && \
    apt-get dist-upgrade -y && \
    apt-get install --no-install-recommends -y apache2-utils && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ADD vhost.conf /etc/nginx/nginx.conf

COPY index.html /usr/share/nginx/html/index.html

RUN htpasswd -bnB admin $HTPASSWD > /etc/nginx/.htpasswd

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]