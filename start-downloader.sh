#!/bin/bash

# This script starts the download script in the background and logs results to a file

mkdir -p ./logs

npm run download &> ./logs/download.log &