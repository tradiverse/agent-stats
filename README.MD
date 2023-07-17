# Space Traders Agent Stats

A simple web based graphical stats page for [Space Traders](https://spacetraders.io) agents

See it in action: [https://tradiverse.github.io/agent-stats/](https://tradiverse.github.io/agent-stats/)


## How it works

Every 10 minutes `update-data.js` downloads all the agent data from `https://api.spacetraders.io/v2/agents`, and saves it to a new file in `client/data` and pushes it to this repo.

The web client (`clients/index.html`) tries to download the most recent file (based on the timestamp in the file name) and iterates backward in time to get historical data.


## How it's built

The download script is a simple node app with minimal dependencies (axios/fs-extra) and a couple little sh scripts for support.

The client is a simple vanilla html/js/css the only dependency is C3 (D3 charting library) loaded from a CDN.


## Frequently Asked Questions

### Couldn't you use a cron to run the update-data task?

Yes. Yes I could.

### Shouldn't you just upload the data to S3 or something instead of git?

Yes. Yes I should.

### You said "minimal dependencies" couldn't you have done this without axios/fs-extra

Yes. Yes I could.

### Isn't this whole thing kinda hacky?

Yes. Yes it is.

### Why didn't you use React?

...

