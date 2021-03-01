const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const verify = require("./verify");

const mongodb = require("mongodb")
const objectId = mongodb.ObjectID

//VALIDATION OF USER INPUTS PREREQUISITES
const Joi = require("@hapi/joi");

const registerSchema = Joi.object({
  fname: Joi.string().min(3).required(),
  lname: Joi.string().min(3).required(),
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});


//SIGNUP USER
router.post("/register",  async (req, res) => {

  //CHECKING IF USER EMAIL ALREADY EXISTS
  const emailExist = await User.findOne({ email: req.body.email });
  if (emailExist)   return res.status(400).send("Email already exists");

  //HASHING THE PASSWORD

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  //ON PROCESS OF ADDING NEW USER

  const user = new User({
    fname: req.body.fname,
    lname: req.body.lname,
    email: req.body.email,
    password: hashedPassword
  });

  try {
    //VALIDATION OF USER INPUTS
    const { error } = await registerSchema.validateAsync(req.body);

    if (error) {
      return res.status(400).send(error.details[0].message);
    }
    else {
      //NEW USER IS ADDED IN THE COLLECTION 'user'
      let randomString = await bcrypt.genSalt(8); 
      user["activateString"] = randomString;
      await user.save();
      
      let activateURL = process.env.baseURL + '/activateAccount';
      const data = await User.findOne({ email: req.body.email });
      activateURL = activateURL+"?id="+data._id+"&ac="+randomString
      
      let activateMail = '<p>Hi,</p>'
              + '<p>Please click on the link below to activate your account</p>'
              + '<a target="_blank" href='+ activateURL +' >' +  activateURL + '</a>'
              + '<p>Regards,</p>'

      const sendMail = require('./services/mailService');
            
      sendMail({
        from: process.env.EMAIL,
        to: req.body.email,
        subject: ' Account Activation',
        text: `${activateURL}`,
        html: `${activateMail}`,
      })
      .then(() => {
        return res.json({success: true});
      })
      .catch(err => {
        
        return res.status(500).json({error: 'Error in sending activation mail .'});
      });
         
      
    }
  } catch (error) {
    console.log("error while registering is: ", error);
    return  res.status(400).send(error);
  }
});


// Activate Account of a USER
router.post("/activate_account", async (req, res) => {
  try {
    // console.log("call reached activate_account");
    let user = await User.findOne({ _id: objectId(req.body.objectId) });
    
    if (user.activateString === req.body.randomString) {
      user["isActivated"] = "true";
    
      await user.save();
      res.status(200).json({ message: "Account activated successfully" });
    } 
    else {
      res.status(401).json({
        message: "You are not authorized",
      });
    }
    
  } catch (error) {
    res.status(500).json({
        message: "Internal Server Error"
    });
  }
});




//SIGNIN USER

router.post("/login", async (req, res) => {
  //CHECKING IF USER EMAIL EXISTS

  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send("Incorrect Email- ID");

  //CHECKING IF USER PASSWORD MATCHES
  
  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword){
    
    return res.status(400).send("Incorrect Password");
  } 

  try {

    //VALIDATION OF USER INPUTS
    const { error } = await loginSchema.validateAsync(req.body);
    
    if (error) return res.status(400).send(error.details[0].message);
    else {
      if (user.isActivated==="true" ) {
        const token = jwt.sign(
          { _id: user._id },
          process.env.TOKEN_SECRET
        );

        res.setHeader("auth-token", token);
        res.status(200).json({
          token: token,
        });
        
      } else {
        res.status(200).json({ message: "seems like your account is not activated" });
      }
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

// Change Password functionality
router.put("/changePassword", async (req, res) => {
  try{
    let data = await (await User.findOne({ email: req.body.email }));
    
    let salt = await bcrypt.genSalt(8);
    if (data) {
      let tempData = {data};
      tempData.data.randomString = salt;
      
      data.set(tempData.data);
      await data.save();
      
      let resetURL = process.env.baseURL + '/passwordreset';
      resetURL = resetURL+"?id="+data._id+"&rs="+salt
          try {
            const sendMail = require('./services/mailService');
            
            sendMail({
              from: process.env.EMAIL,
              to: req.body.email,
              subject: 'Reset Password',
              text: `${resetURL}`,
              html: `${resetURL}`,
            })
            .then(() => {
              return res.json({success: true});
            })
            .catch(err => {
              console.log("sneding email:" + err);
              return res.status(500).json({error: 'Error in email sending.'});
            });
        } 
        catch(err) {
          return res.status(500).send({ error: 'Something went wrong.'});
        }
      }
      else {
        res.status(400).json({
          message: "User is not registered"
        });
      }
  }
  catch(error){
    console.log("error is:" + error);
    res.status(500).json({
        message: "Internal Server Error"
    })
}
});

// Update Password functionality
router.post("/verifyPasswordChange", async (req, res) => {
  try {
    
    let data = await User.findOne({ _id: objectId(req.body.objectId) });
    if (data.randomString === req.body.randomString) {
      res.status(200).json({ message: "Verification success" });
    } 
    else {
      res.status(401).json({
        message: "You are not authorized",
      });
    }
  } 
  catch (error) {
    console.log("error is: " + error);
    res.status(500).json({
        message: "Internal Server Error"
    });
  }    
});

// updateDBWithPassword
router.put("/updatePassword", async (req, res) => {
  try{
    let salt = await bcrypt.genSalt(10); 
    
    let hash = await bcrypt.hash(req.body.password, salt);
    req.body.password = hash;
    let data = await User.findOne({ _id: objectId(req.body.objectId) });
    
    data.password = hash;
    
    await data.save();
    data1 = await User.findOne({ _id: objectId(req.body.objectId) });
    
    res.status(200).json({
        message : "Password Changed Successfully"
    })
  }
  catch(error){
    res.status(500).json({
        message: "Error while changing the password"
    })
  }
});


// Validate OTP
router.post("/validateOTP",verify, async (req, res) => {
  try{
    let otp = req.body.otp;
    
    if(otp==="576" ||  otp==="1964" || otp==="15764" ){
      res.status(200).json({
          message : "OTP Verified"
      });
    }
    else{
      res.status(200).json({
        message: "OTP Incorrect",
      });
    }
  }
  catch(error){
    console.log("in catch of validateOTP error is: ", error);
    res.status(500).json({
        message: "You are not authorized"
    })
  }
});


// Resend OTP
router.post("/resndOTP",verify, async (req, res) => {
  try{
    
    let data = await (await User.findOne({ email: req.body.email }));

    let resendOTPLimit = data.resendOTPLimit - 1;
    
    if(data.resendOTPLimit>0){
      data.resendOTPLimit = resendOTPLimit;
      await data.save();

      res.status(200).json({
          message : "OTP Resent Successfully"
      });
    }
    else{
      res.status(200).json({
        message: "Resend OTP Limit exceeded",
      });
    }
  }
  catch(error){
    console.log("in catch of resendOTPLimit error is: ", error);
    res.status(500).json({
        message: "You are not authorized"
    })
  }
});


module.exports = router;
