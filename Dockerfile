FROM node:alpine

# Create app directory and set as working directory:
#
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies as global node modules:
#
ENV NODE_PATH /usr/local/lib/node_modules

# ...Mocha, Chai and friends
RUN npm install -g \
  chai \
  chai-http \
  chai-as-promised \
  mocha

# ...Highland
RUN npm install -g \
  highland@^2.7.3

# ...Lodash
RUN npm install -g \
  lodash@^4.8.2

# Bundle app source
#
COPY . /usr/src/app

# Wait until ElasticSearch is ready and then run the tests:
#
CMD [ \
  "/bin/sh", \
  "-c", \
  " \
    sleep 5; \
    while ! nc -z elasticsearch 9200; \
    do \
      echo sleeping; \
      sleep 1; \
    done; \
    echo Connected!; \
    mocha \
  " \
]
