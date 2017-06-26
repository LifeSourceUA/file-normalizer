FROM hope/nodejs:6

ENV \
    NODE_ENV=production

WORKDIR /data/app

RUN \
    apk add --no-cache --virtual=build-dependencies git && \

    git clone --depth 1 https://github.com/LifeSourceUA/file-normalizer.git -b master . && \
    npm install && \

    apk del build-dependencies

ENTRYPOINT ["npm", "start"]
