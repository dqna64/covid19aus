const axios = require("axios");
const cheerio = require("cheerio");

const flightEntriesUrls = {
  web: {
    archived:
      "https://www.health.nsw.gov.au/Infectious/covid-19/Pages/flights-archive.aspx#nsw-domestic",
    recent:
      "https://www.health.nsw.gov.au/Infectious/covid-19/Pages/flights.aspx",
  },
};

const loadDocument = async (url) => {
  const response = await axios(url);
  return cheerio.load(response.data); // cheerio parses the string of html into actual html
};

async function getHalfFlightData(url) {
  const $ = await loadDocument(url);
  const title = $(".pagetitle").text();

  let entries = [];
  $("table.moh-rteTable-6 > tbody > tr").each((index, element) => {
    let entry = $(element).text();
    entries.push(entry);
    // An entry may be a header or a row
    // header e.g. 'Flight\nAirline\nOrigin/Destination\nDate of departure\nDate of arrival\nClose contact rows'
    // row e.g. 'QF528\nQantas\nSydney/Brisbane\n28 March 2020\n28 March 2020\n20, 21, 22, 23, 24'
  });
  let domesticEntries = [];
  let internationalEntries = [];
  let entrypoints = ["init", domesticEntries, internationalEntries];
  let entryCounter = 0;
  let headings = [];
  for (let i = 0; i < entries.length; i++) {
    let entry = entries[i];
    let items = entries[i].split("\n");
    if (items[0] === "Flight") {
      entryCounter++; // next entry point
      headings = [...items]; // set headings
    } else {
      let entryObj = {};
      for (let j = 0; j < headings.length; j++) {
        // For each heading and its corresponding datapoint in the current row,
        // Add the key-value pair to the new entry object
        if (headings[j] === "Origin/Destination") {
          let locations = items[j].split("/");
          entryObj["Origin"] = locations[0];
          entryObj["Destination"] = locations[1];
          // Note: 'Sydney' could be 'Sydney(via Singpore)'
        } else {
          entryObj[headings[j]] = items[j]; // e.g. 'Flight: QF528'
        }
      }
      entrypoints[entryCounter].push(entryObj); // Append new entry object to its array
    }
  }
  domesticEntries.reverse(); // For chronological order earliest ~ latest
  internationalEntries.reverse();
  return { domesticEntries, internationalEntries }; // Each entries array looks like [{}, {}, ...]
}

async function getFlightData() {
  const archivedEntries = await getHalfFlightData(
    flightEntriesUrls.web.archived
  );
  const recentEntries = await getHalfFlightData(flightEntriesUrls.web.recent);
  const domesticEntries = [
    ...archivedEntries.domesticEntries,
    ...recentEntries.domesticEntries,
  ];
  const internationalEntries = [
    ...archivedEntries.internationalEntries,
    ...recentEntries.internationalEntries,
  ];
  return { domesticEntries, internationalEntries };
}

exports.getFlightData = getFlightData;
