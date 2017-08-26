FROM alpine:3.5
COPY bin/kuill /kuill
COPY ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

COPY templates/ /templates/

ENTRYPOINT ["/kuill"]
