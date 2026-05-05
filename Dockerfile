FROM ubuntu:latest
LABEL authors="harsh"

ENTRYPOINT ["top", "-b"]
