#!/bin/bash

echo "pulling..."
git pull

echo "adding data..."
git add ./client/data
git commit -m "Save updated data"

echo "pushing..."
git push

echo "done"
