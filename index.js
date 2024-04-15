import express from "express";
import pg from "pg";

import bodyParser from "body-parser";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Arya@8955",
  port:5432
})

db.connect();


const app = express();
const port = 3000;
app.use(express.static('public'))
app.listen(port, (req, res) => {
  console.log("Listening on port " + port);
})
app.use(bodyParser.urlencoded({ extended: true }));

function isValidString(str) {
  return /^[A-Za-z0-9\s]+$/.test(str);
}

function removeWhitespace(str) {
  return str.trim();
}

let error;
let current_user_id =-1;
app.get("/",async (req, res) => {  // home page 
  let users =(await db.query("Select * from users")).rows;
  
  let countries =(await db.query(`select country_code from visited_country where user_id=${current_user_id}`)).rows;
  let color = (current_user_id !== -1) ? ((await db.query(`select color from users where id='${current_user_id}'`)).rows[0].color) : "black";
  
  res.render("index.ejs", { users: users, total:countries?countries.length:0,error:error,countries:countries,color:color});
  error = "";
});




app.post("/add",async (req, res) => {    // add a visited country to current user
  
  console.log(req.body);

  if (current_user_id == -1) {
    
    error = "Please select a family member before continuing";
    res.redirect("/");
  }
  else if (req.body.add == "add") {
    let country_name = removeWhitespace((req.body.country).toLowerCase());
    console.log(country_name);
    
    const result = (await db.query(`select country_code from countries where lower(country_name)='${country_name}'`)).rows;
      
    if (result.length) {
      
      try {
        await db.query("insert into visited_country(country_code,user_id) values($1,$2)", [result[0].country_code, current_user_id]);
      }
      catch (errors) {
        error = "This country is already visited by you";
      }
    }
    else error = "Invalid Country Name";
    
    res.redirect("/");
  }
  else {
    let country_name = removeWhitespace((req.body.country).toLowerCase());
    const result = (await db.query(`select country_code from countries where lower(country_name)='${country_name}'`)).rows;
      
    if (result.length) {
      
      try {
        await db.query(`delete from visited_country where country_code='${result[0].country_code}' and user_id=${current_user_id}`);
      }
      catch (errors) {
        error = "You havent been to this country yet";
      }
    }
    else error = "Invalid Country Name";
    
    res.redirect("/");    
  }
});


app.post("/user",async (req, res) => {   // method to update visited countried or make a new user

  
  
  if (req.body.add === "new") { //make a new user
    res.render("new.ejs");
  }
  else {      //update visited country for our current user
    current_user_id = parseInt(req.body.add);
    res.redirect("/");
  }
})



app.post("/new",async (req, res) => {   //adding a new user to database
  let name = removeWhitespace(req.body.name);
  let clr = req.body.color;
  console.log(name, clr);
  if (clr == null && !isValidString(name)) res.render("new.ejs", { error: "Name and Color cant be empty" });
  
  else if (clr == null) res.render("new.ejs", { error: "Color cant be empty" });
  else if(!isValidString(name)) res.render("new.ejs", { error: "Name cant be empty" });
  else {
      try {
        await db.query("insert into users(name,color) values($1,$2)", [name, clr]);  
      
        current_user_id= (await db.query(`select id from users where name='${name}'`)).rows[0].id;
  
      res.redirect("/");
    } catch (error) {
    // Code to run if an error occurs
      res.render("new.ejs", { error: "This name already exists...Please choose another name" });
    }    
  }

  

})
