FROM node:16-alpine

ENV WORK /opt/jore
ENV NODE_ENV production

# Create app directory
RUN mkdir -p ${WORK}
WORKDIR ${WORK}

# Install app dependencies
COPY package.json yarn.lock ${WORK}/
RUN yarn install && yarn cache clean

# Copy app source
COPY . ${WORK}

# Linting removed because linter is not available in production mode. Configure auto-lint in other way!
# RUN yarn lint 

EXPOSE 3000

CMD yarn start
