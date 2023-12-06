import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import 'dotenv/config'
import { DataTypes, Model, Sequelize } from "sequelize"
import bcrypt, { hash } from 'bcrypt'
import jwt from 'jsonwebtoken'

let app = express();
app.use(cors());
app.use(bodyParser.json());
const port = parseInt(process.env.PORT as string);

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './db.sqlite',
});

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
}, {
  timestamps: false,
})

const FreeGames = sequelize.define('FreeGames', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  urlimage : {
    type: DataTypes.STRING,
    allowNull: false
  }
})

const OfficialGames = sequelize.define('OfficialGames', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  urlimage : {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
})

User.sync({force: true})
FreeGames.sync({force: true})
OfficialGames.sync({force: true})

interface IRequestUserBody {
  username: number,
  email: string,
  password: string
}

interface IRequestFreeGamesBody {
  name: string,
  description: string,
  urlimage: string
}

interface IRequestOfficialGamesBody {
  name: string,
  description: string,
  urlimage: string,
  price: number
}

// route création utilisateur
app.post('/users/register', async(req, res) => {
  const usernameReq = req.body.username;
  const emailReq = req.body.email;
  const passwordReq = req.body.password;

  const uniqueMail = await User.findOne({ where: {email: emailReq}});
  if (uniqueMail === null) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(passwordReq, saltRounds)

    await User.create({
      usernameReq,
      emailReq,
      hash
    })
    res.status(200)
  } else {
    return res.status(400)
  }
})

// route connexion utilisateur
app.post('/users/auth/', async(req, res) => {
  const {email, password} = req.body as IRequestUserBody;

  const user = await User.findOne({where: {email}})

  if (user === null) {
    return res.status(400).json({message: "Le couple email/mot de passe est invalide"})
  } else if (user !== null) {
    // @ts-ignore
    const passwordVerification = await bcrypt.compare(password, user.password);
      if (!passwordVerification) {
        return res.status(401)
      } else {
        //@ts-ignore
        const token = jwt.sign({email: user.email, password: user.password}, process.env.JWT_SECRET_KEY, {expiresIn: '1h'});
        return res.status(200).json({token});
      };
  }
  }
)

// créer un nouveau jeu gratuit
app.post('http://localhost:3333/freegames/', async(req, res) => {
  try {
    let {name, description, urlimage} = req.body as IRequestFreeGamesBody;
  
    const newFreeGames = await FreeGames.create({
      name,
      description,
      urlimage
    });
    res.status(200).json(newFreeGames);
  } catch (error) {
    console.error('Erreur', error)
  }
});

// récupérer tous les jeux
app.get('http://localhost:3333/freegames/', async(_, res) => {
  try {
    const allFreeGames = await FreeGames.findAll();
    res.status(200).json(allFreeGames);
  } catch (error) {
    console.error('Erreur récupération jeux gratuits', error);
  }
});

//récupérer un jeu gratuit par son nom
app.get('http://localhost:3333/freegames/:name', async(req, res) => {
  try {
    const oneFreeGames = await FreeGames.findOne({where: {name: req.params.name}});
    res.status(200).json(oneFreeGames)
  } catch (error) {
    console.error('Erreur récupération jeu gratuit par nom', error)
  }
})

//modifier un jeu gratuit
app.put('http://localhost:3333/freegames/:id', async(req, res) => {
  try {
    const gameToModify = await FreeGames.findOne({where :{id: req.params.id}});
    if (gameToModify === null) {
      res.status(400).json({message: 'Le jeu gratuit n\'existe pas'});
    } else {
      await FreeGames.update({
        name: req.body.name,
        description: req.body.description,
        image: req.body.image,
      }, {
        where: {id: req.params.id}
      })
      res.status(200).json({message: 'Le jeu gratuit a été modifié'});
    } 
  } catch (error) {
    res.status(400).json({message: 'Erreur modification jeu gratuit', error});
  }
})

// détruire un jeu gratuit
app.delete('http://localhost:3333/freegames/:name', async(req, res) => {
  try {
    await FreeGames.destroy({
    where: {
      name: req.params.name
    }
  })
  res.status(200).json({message: "Le jeu a été supprimé"})
  } catch (error) {
    res.status(400).json({message: 'Erreur suppression jeu', error})
  }
})

// créer un jeu payant
app.post('http://localhost:3333/officialgames/', async(req, res) => {
  try {
    let {name, description, urlimage, price} = req.body as IRequestOfficialGamesBody;
  
    const newOfficialGames = await FreeGames.create({
      name,
      description,
      urlimage,
      price
    });
    res.status(200).json(newOfficialGames);
  } catch (error) {
    console.error('Erreur création jeu payant', error)
  }
});

// récupérer tous les jeux payants
app.get('http://localhost:3333/officialgames/', async(_, res) => {
  try {
    const allOfficialGames = await OfficialGames.findAll();
    res.status(200).json(allOfficialGames);
  } catch (error) {
    console.error('Erreur récupération jeux payants', error);
  }
});

// récupérer un jeu payant
app.get('http://localhost:3333/officialgames/:name', async(req, res) => {
  try {
    const oneOfficialGames = await OfficialGames.findOne({where: {name: req.params.name}});
    res.status(200).json(oneOfficialGames)
  } catch (error) {
    console.error('Erreur récupération jeu payant par nom', error)
  }
})

// modifier un jeu payant
app.put('http://localhost:3333/officialgames/:id', async(req, res) => {
  try {
    const gameToModify = await OfficialGames.findOne({where :{id: req.params.id}});
    if (gameToModify === null) {
      res.status(400).json({message: 'Le jeu payant n\'existe pas'});
    } else {
      await OfficialGames.update({
        name: req.body.name,
        description: req.body.description,
        image: req.body.image,
      }, {
        where: {id: req.params.id}
      })
      res.status(200).json({message: 'Le jeu payant a été modifié'});
    } 
  } catch (error) {
    res.status(400).json({message: 'Erreur modification jeu payant', error});
  }
})

// supprimer un jeu payant
app.delete('http://localhost:3333/officialgames/:name', async(req, res) => {
  try {
    await OfficialGames.destroy({
      where: {
        name: req.params.name
      }
    })
  res.status(200).json({message: "Le jeu a été supprimé"})
  } catch (error) {
    res.status(400).json({message: 'Erreur suppression jeu', error})
  }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})