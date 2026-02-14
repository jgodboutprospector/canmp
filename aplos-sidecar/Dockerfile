FROM node:20-alpine

WORKDIR /app
COPY server.js .

RUN addgroup --system --gid 1001 sidecar && \
    adduser --system --uid 1001 sidecar

USER sidecar

EXPOSE 3001

# This sidecar is the ONLY container that needs the CVE revert
# for Aplos RSA PKCS#1 v1.5 token decryption
CMD ["node", "--security-revert=CVE-2023-46809", "server.js"]
