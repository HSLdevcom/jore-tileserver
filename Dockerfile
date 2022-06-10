FROM node:16-alpine

ENV WORK /opt/jore

# Create app directory
RUN mkdir -p ${WORK}
WORKDIR ${WORK}

# Install app dependencies
COPY package.json yarn.lock ${WORK}/
RUN yarn install && yarn cache clean

# Copy app source
COPY . ${WORK}

RUN yarn lint

EXPOSE 3000

CMD yarn start
