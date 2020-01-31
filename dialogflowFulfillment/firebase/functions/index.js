'use strict';

const functions = require('firebase-functions');
const {dialogflow,BasicCard,Image,Button,Suggestions}=require("actions-on-google")
const app = dialogflow({debug:true});

app.intent("Default Welcome Intent",(conv)=>{
	conv.ask("I am here dude");
})

app.intent("play_note",(conv)=>{
	conv.ask("I am here dude2");
  	conv.ask(new BasicCard({
      title:"About note",
      substitle:"This is note $noteName",
      text:"test version of test for that cardYK",
      
      image : new Image({
      	alt : "some note YK",
        url : "https://en.wikipedia.org/wiki/C_(musical_note)#/media/File:Middle_C.png",
      }),
      
      buttons: new Button({
      		url : "https://imgbb.com",
        	title:"Image BB"
      }),
      display : "DEFAULT"
	}))
  
})

app.intent('Media Response', (conv) => {
  if (!conv.surface.capabilities
    .has('actions.capability.MEDIA_RESPONSE_AUDIO')) {
      conv.ask('Sorry, this device does not support audio playback.');
      conv.ask('Which response would you like to see next?');
      return;
  }

  conv.ask('This is a media response example.');
  conv.ask(new MediaObject({
    name: 'Jazz in Paris',
    url: 'https://storage.googleapis.com/automotive-media/Jazz_In_Paris.mp3',
    description: 'A funky Jazz tune',
    icon: new Image({
      url: 'https://storage.googleapis.com/automotive-media/album_art.jpg',
      alt: 'Album cover of an ocean view',
    }),
  }));
  conv.ask(new Suggestions(['Basic Card', 'List',
    'Carousel', 'Browsing Carousel']));
});



const {google} = require('googleapis');
const {WebhookClient} = require('dialogflow-fulfillment');

// Enter your calendar ID and service account JSON below.
const calendarId = '<INSERT CALENDAR ID HERE>'; // Example: 6ujc6j6rgfk02cp02vg6h38cs0@group.calendar.google.com
const serviceAccount = {}; // The JSON object looks like: { "type": "service_account", ... }

// Set up Google Calendar service account credentials
const serviceAccountAuth = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: 'https://www.googleapis.com/auth/calendar'
});

const calendar = google.calendar('v3');
process.env.DEBUG = 'dialogflow:*'; // It enables lib debugging statements

const timeZone = 'America/Los_Angeles';  // Change it to your time zone
const timeZoneOffset = '-07:00';         // Change it to your time zone offset

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });

  function makeAppointment (agent) {
    // Use the Dialogflow's date and time parameters to create Javascript Date instances, 'dateTimeStart' and 'dateTimeEnd',
    // which are used to specify the appointment's time.
    const appointmentDuration = 1;// Define the length of the appointment to be one hour.
    const dateTimeStart = convertParametersDate(agent.parameters.date, agent.parameters.time);
    const dateTimeEnd = addHours(dateTimeStart, appointmentDuration);
    const appointmentTimeString = getLocaleTimeString(dateTimeStart);
    const appointmentDateString = getLocaleDateString(dateTimeStart);
    // Check the availability of the time slot and set up an appointment if the time slot is available on the calendar
    return createCalendarEvent(dateTimeStart, dateTimeEnd).then(() => {
      agent.add(`Got it. I have your appointment scheduled on ${appointmentDateString} at ${appointmentTimeString}. See you soon. Good-bye.`);
    }).catch(() => {
      agent.add(`Sorry, we're booked on ${appointmentDateString} at ${appointmentTimeString}. Is there anything else I can do for you?`);
    });
  }
  let intentMap = new Map();
  intentMap.set('Make Appointment', makeAppointment);  // It maps the intent 'Make Appointment' to the function 'makeAppointment()'
    agent.handleRequest(intentMap);
});

function createCalendarEvent (dateTimeStart, dateTimeEnd) {
  return new Promise((resolve, reject) => {
    calendar.events.list({  // List all events in the specified time period
      auth: serviceAccountAuth,
      calendarId: calendarId,
      timeMin: dateTimeStart.toISOString(),
      timeMax: dateTimeEnd.toISOString()
    }, (err, calendarResponse) => {
      // Check if there exists any event on the calendar given the specified the time period
      if (err || calendarResponse.data.items.length > 0) {
        reject(err || new Error('Requested time conflicts with another appointment'));
      } else {
        // Create an event for the requested time period
        calendar.events.insert({ auth: serviceAccountAuth,
          calendarId: calendarId,
          resource: {summary: 'Bike Appointment',
            start: {dateTime: dateTimeStart},
            end: {dateTime: dateTimeEnd}}
        }, (err, event) => {
          err ? reject(err) : resolve(event);
        }
        );
      }
    });
  });
}

// A helper function that receives Dialogflow's 'date' and 'time' parameters and creates a Date instance.
function convertParametersDate(date, time){
  return new Date(Date.parse(date.split('T')[0] + 'T' + time.split('T')[1].split('-')[0] + timeZoneOffset));
}

// A helper function that adds the integer value of 'hoursToAdd' to the Date instance 'dateObj' and returns a new Data instance.
function addHours(dateObj, hoursToAdd){
  return new Date(new Date(dateObj).setHours(dateObj.getHours() + hoursToAdd));
}

// A helper function that converts the Date instance 'dateObj' into a string that represents this time in English.
function getLocaleTimeString(dateObj){
  return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: timeZone });
}

// A helper function that converts the Date instance 'dateObj' into a string that represents this date in English. 
function getLocaleDateString(dateObj){
  return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: timeZone });
}