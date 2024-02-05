var koa = require('koa');
var app = module.exports = new koa();
const server = require('http').createServer(app.callback());
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const Router = require('koa-router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');

app.use(bodyParser());

app.use(cors());

app.use(middleware);

function middleware(ctx, next) {
  const start = new Date();
  return next().then(() => {
    const ms = new Date() - start;
    console.log(`${start.toLocaleTimeString()} ${ctx.response.status} ${ctx.request.method} ${ctx.request.url} - ${ms}ms`);
  });
}

const medicalSupplies = [
  { id: 1, name: "Bandages", supplier: "Medical Supplies Inc.", details: "Sterile adhesive bandages for wound care", status: "in stock", quantity: 500, type: "consumables" },
  { id: 2, name: "MRI Machine", supplier: "MedTech Solutions", details: "State-of-the-art Magnetic Resonance Imaging machine", status: "out of stock", quantity: 0, type: "equipment" },
  { id: 3, name: "Antibiotics", supplier: "PharmaCare Ltd.", details: "Broad-spectrum antibiotics for infections", status: "pending", quantity: 1000, type: "medication" },
  { id: 4, name: "Surgical Gloves", supplier: "GlovesWorld", details: "Latex-free surgical gloves for medical procedures", status: "in stock", quantity: 2000, type: "consumables" },
  { id: 5, name: "X-ray Machine", supplier: "Imaging Systems Co.", details: "High-resolution X-ray imaging equipment", status: "in stock", quantity: 3, type: "equipment" },
  { id: 6, name: "Vaccines", supplier: "BioPharma Innovations", details: "Various vaccines for preventive healthcare", status: "out of stock", quantity: 0, type: "medication" },
  { id: 7, name: "Wheelchairs", supplier: "Mobility Solutions Ltd.", details: "Manual and electric wheelchairs for patient mobility", status: "in stock", quantity: 15, type: "equipment" },
  { id: 8, name: "Disposable Syringes", supplier: "MediInject", details: "Single-use syringes for medical injections", status: "in stock", quantity: 1000, type: "consumables" },
  { id: 9, name: "Blood Pressure Monitors", supplier: "HealthTech Devices", details: "Digital monitors for accurate blood pressure measurement", status: "pending", quantity: 50, type: "equipment" },
  { id: 10, name: "Painkillers", supplier: "PainRelief Pharma", details: "Analgesics for pain management", status: "in stock", quantity: 800, type: "medication" },
  { id: 11, name: "Sutures", supplier: "WoundCare Solutions", details: "Absorbable and non-absorbable sutures for surgical procedures", status: "out of stock", quantity: 0, type: "consumables" },
  { id: 12, name: "Ultrasound Machine", supplier: "UltraScan Technologies", details: "Diagnostic ultrasound equipment for medical imaging", status: "in stock", quantity: 2, type: "equipment" },
  { id: 13, name: "Insulin", supplier: "Diabetes Pharma", details: "Insulin for diabetes management", status: "in stock", quantity: 300, type: "medication" },
  { id: 14, name: "N95 Masks", supplier: "SafetyGear Inc.", details: "High-quality N95 masks for respiratory protection", status: "pending", quantity: 1000, type: "consumables" },
  { id: 15, name: "Defibrillators", supplier: "HeartLife Technologies", details: "Automated external defibrillators for cardiac emergencies", status: "in stock", quantity: 5, type: "equipment" },
];

const router = new Router();

router.get('/medicalsupplies', ctx => {
  ctx.response.body = medicalSupplies;
  ctx.response.status = 200;
});

router.get('/suppliestypes', ctx => {
  ctx.response.body = medicalSupplies.filter(entry => entry.status != "out of stock");
  ctx.response.status = 200;
});

router.get('/supplyorders', ctx => {
  ctx.response.body = medicalSupplies.filter(entry => entry.status == "pending");
  ctx.response.status = 200;
});

router.get('/medicalsupply/:id', ctx => {
  // console.log("ctx: " + JSON.stringify(ctx));
  const headers = ctx.params;
  // console.log("body: " + JSON.stringify(headers));
  const id = headers.id;
  if (typeof id !== 'undefined') {
    const index = medicalSupplies.findIndex(entry => entry.id == id);
    if (index === -1) {
      const msg = "No entity with id: " + id;
      console.log(msg);
      ctx.response.body = { text: msg };
      ctx.response.status = 404;
    } else {
      let entry = medicalSupplies[index];
      ctx.response.body = entry;
      ctx.response.status = 200;
    }
  } else {
    ctx.response.body = { text: 'Id missing or invalid' };
    ctx.response.status = 404;
  }
});

const broadcast = (data) =>
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });


router.post('/medicalsupply', ctx => {
  // console.log("ctx: " + JSON.stringify(ctx));
  const headers = ctx.request.body;
  // console.log("body: " + JSON.stringify(headers));
  const name = headers.name;
  const supplier = headers.supplier;
  const details = headers.details;
  const status = headers.status;
  const quantity = headers.quantity;
  const type = headers.type;
  if (typeof name !== 'undefined'
    && typeof supplier !== 'undefined'
    && typeof details !== 'undefined'
    && typeof status !== 'undefined'
    && typeof quantity !== 'undefined'
    && typeof type !== 'undefined') {
    const index = medicalSupplies.findIndex(entry => entry.name == name && entry.supplier == supplier);
    if (index !== -1) {
      const msg = "The entity already exists!";
      console.log(msg);
      ctx.response.body = { text: msg };
      ctx.response.status = 404;
    } else {
      let maxId = Math.max.apply(Math, medicalSupplies.map(entry => entry.id)) + 1;
      let entry = {
        id: maxId,
        name,
        supplier,
        details,
        status,
        quantity,
        type
      };
      medicalSupplies.push(entry);
      broadcast(entry);
      ctx.response.body = entry;
      ctx.response.status = 200;
    }
  } else {
    const msg = "Missing or invalid name: " + name + " supplier: " + supplier + " details: " + details
      + " status: " + status + " quantity: " + quantity + " type: " + type;
    console.log(msg);
    ctx.response.body = { text: msg };
    ctx.response.status = 404;
  }
});

router.put('/requestsupply/:type', ctx => {
  const headers = ctx.params;
  const type = headers.type;
  if (typeof type !== 'undefined') {
    const index = medicalSupplies.findIndex(entry => entry.type == type);
    if (index === -1) {
      //create new entry
      const msg = "No entity with type: " + type;
      console.log(msg);
      ctx.response.body = { text: msg };
      ctx.response.status = 404;
    } else {
      let entry = medicalSupplies[index];
      entry.quantity++;
      ctx.response.body = entry;
      ctx.response.status = 200;
    }
  } else {
    const msg = "Type missing or invalid. type: " + type;
    console.log(msg);
    ctx.response.body = { text: msg };
    ctx.response.status = 404;
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = 2406;

server.listen(port, () => {
  console.log(`🚀 Server listening on ${port} ... 🚀`);
});