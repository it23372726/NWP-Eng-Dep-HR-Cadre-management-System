FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM registry.access.redhat.com/ubi9/nginx-124:latest

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ /opt/app-root/src/

EXPOSE 8080

# This Red Hat UBI image defaults to a non-root user and supports OpenShift's
# arbitrary UID model. OpenShift may replace this UID at runtime.
USER 1001

CMD ["nginx", "-g", "daemon off;"]
