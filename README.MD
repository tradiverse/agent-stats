# Space Traders Agent Stats

A simple web based graphical stats page for [Space Traders](https://spacetraders.io) agents

See it in action: [https://tradiverse.github.io/agent-stats/](https://tradiverse.github.io/agent-stats/)


## Features

- Bar chart of latest credits per agent
- Bar chart of latest ships per agent
- Line chart of credits per agent over time
- Line chart of ships per agent over time
- Ability to filter to any set of agents
- It **mostly** works on mobile!!


## Usage

Clone this repo and install dependencies (`npm i`)

- `npm start` - start web client in local server
- `npm run download` - start data downloader (downloads data every 10 minutes and attempts to push to git)

> NOTE: the client (`client/main.js`) has this server hard-coded for the data source so if you run it locally it should still use the data in this repo. If you want to use local data or your own data source you will have to change that value.


## How it works

Every 10 minutes `update-data.js` downloads all the agent data from `https://api.spacetraders.io/v2/agents`, and saves it to a new file in `client/data` and pushes it to this repo.

The web client (`clients/index.html`) tries to download the most recent file (based on the timestamp in the file name) and iterates backward in time to get historical data.


## How it's built

The download script is a simple node app with minimal dependencies (axios/fs-extra) and a couple little sh scripts for support.

The client is a simple vanilla html/js/css the only dependency is C3 (D3 charting library) loaded from a CDN.


## Frequently Asked Questions

### Shouldn't you just upload the data to S3 or something instead of git?

Yes. Yes I should.

### You said "minimal dependencies" couldn't you have done this without axios/fs-extra

Yes. Yes I could.

### Wouldn't it be better to use a cron to run the update-data task instead of setInterval?

Yes. Yes it would.

### Isn't this whole thing kinda hacky?

Yes. Yes it is.

### Why didn't you use React?

...................... ^_^

