FROM python:3.7

ENV PYTHONUNBUFFERED=1
ENV PYTHON_VERSION=3.7

ARG AUTH_FAKE

# postgres 10
RUN wget -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=1 apt-key add - && \
    echo "deb http://apt.postgresql.org/pub/repos/apt bullseye-pgdg main" > /etc/apt/sources.list.d/pgdg_bullseye.list

# random
RUN apt-get update -y && \
    apt-get -y install \
    postgresql-client-10 \
    gettext \
    libjpeg-dev \
    yasm \
    libmemcached-dev \
    zlib1g-dev \
    libssl-dev \
    runit \
    locales \
    cmake \
    libxtst6 libx11-xcb1 libnss3 libasound2 libatk-bridge2.0-0 libgtk-3-0 ca-certificates && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/*

# opencv & hnswlib
RUN pip install --upgrade pip==22.0.4 wheel numpy==1.17.4 pybind11
RUN cd /tmp && \
    git clone -b 3.4.18 --depth 1 https://github.com/opencv/opencv && \
    cd opencv && \
    mkdir build && \
    cd build && \
    cmake .. && \
    make && \
    make install && \
    ldconfig && \
    rm -rf /tmp/*
RUN cd /tmp && \
    git clone --depth 1 https://github.com/nmslib/hnswlib && \
    cd hnswlib && \
    pip install . && \
    rm -rf /tmp/*

# ffmpeg
RUN wget https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz && \
    tar xf ffmpeg-git-amd64-static.tar.xz --strip-components 1 --wildcards -C \
    /usr/local/bin '*/ffmpeg' '*/ffprobe' && \
    rm ffmpeg-git-amd64-static.tar.xz

# phantomjs
ENV PHANTOM_VERSION=2.1.1
RUN wget https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-${PHANTOM_VERSION}-linux-x86_64.tar.bz2 && \
    tar -xf phantomjs-${PHANTOM_VERSION}-linux-x86_64.tar.bz2 && \
    mv phantomjs-${PHANTOM_VERSION}-linux-x86_64/bin/phantomjs /usr/bin/ && \
    rm phantomjs-${PHANTOM_VERSION}-linux-x86_64.tar.bz2 && \
    rm -rf phantomjs-${PHANTOM_VERSION}-linux-x86_64

# jq
RUN JQ_URL="https://circle-downloads.s3.amazonaws.com/circleci-images/cache/linux-amd64/jq-latest" && \
    curl --show-error --location --fail --retry 3 --output /usr/bin/jq $JQ_URL && \
    chmod +x /usr/bin/jq && jq --version

# nodejs
RUN curl -L https://deb.nodesource.com/setup_14.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/*

# locale and timezone
RUN locale-gen C.UTF-8 || true
ENV LANG=C.UTF-8
RUN ln -sf /usr/share/zoneinfo/Etc/UTC /etc/localtime

# requirements
ADD config/requirements.txt /tmp/
RUN pip install --no-cache-dir -Ur /tmp/requirements.txt && rm /tmp/requirements.txt

# ipython custom config
ADD config/patches/ipython_config.py /root/.ipython/profile_default/ipython_config.py

# code
ADD . /app/

# compile translations
RUN cd /app/project/ && PYTHONPATH=/app/project/:$PYTHONPATH DJANGO_SETTINGS_MODULE=settings django-admin compilemessages

# done!
WORKDIR /app

EXPOSE 8000
EXPOSE 9000
EXPOSE 5555
