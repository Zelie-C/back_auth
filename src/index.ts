import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import 'dotenv/config'
import { DataTypes, Sequelize } from "sequelize"
import { errorMonitor } from 'stream'

let app = express();
app.use(cors());
app.use(bodyParser.json());
const port = parseInt(process.env.PORT as string);

// const username = process.env.USERNAME as string;
// const password = process.env.PASSWORD as string;
// const database = process.env.DATABASE as string;
// const server = process.env.SERVER as string;

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
  name: string,
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

app.post('/users/register', async(req, res) => {
  const usernameReq = req.body.username;
  const emailReq = req.body.email;
  const passwordReq = req.body.password;

  const uniqueMail = await User.findOne({ where: {email: emailReq}});
  if (uniqueMail === null) {
    await User.create({
      usernameReq,
      emailReq,
      passwordReq
    })
    res.status(200)
  } else {
    return res.status(400)
  }
})

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
app.put('http://localhost:3333/freegames/:name', async(req, res) => {
  try {

  } catch (error) {
    console.error('Erreur modification jeu gratuit', error);
  }
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})