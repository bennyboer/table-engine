# Table Engine

> Library to visualize huge tables in web environments with high-performance rendering.

Work in progress, come back later to receive some updates!

## Demo

You might want to take a look at the current example being constantly rebuilt during
development: https://bennyboer.github.io/table-engine/.

## Architecture

We aim to provide a high-performance table library that may display nearly infinite amounts of data without the user
really noticing. Normal HTML table elements get pretty laggy when getting large and are thus not always an option. This
library builds around HTML5 canvas to draw the table from scratch, thus achieving a smooth user experience.
