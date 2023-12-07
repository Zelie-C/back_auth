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
const jwtSecretToken = process.env.JWT_TOKEN_KEY as string

const authentificateToken = (req: any, res: any, next: any) => {
  const tokenHeader = req.headers.authorization
  const token = tokenHeader.split(' ')[1]

  if (tokenHeader === null) {
    return res.status(400).json({message: 'Token inexistant'})
  }

  jwt.verify(token, jwtSecretToken, (err: any, user: any) => {
    if (err) {
      return res.status(401)
    }
    req.user = user;
    next()
  })
}

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

const Tokens = sequelize.define('Tokens', {
  token: {
    type: DataTypes.STRING,
    allowNull: false,
  }
})

User.sync()
// User.sync({force: true})
FreeGames.sync()
//FreeGames.sync({force: true})
OfficialGames.sync()
//OfficialGames.sync({force: true})
Tokens.sync()
//Tokens.sync({force: true})

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
app.post('/api/auth/local/register', async(req, res) => {
  console.log('body', req.body)

  try {
    const usernameReq = req.body.username;
    const emailReq = req.body.email;
    const passwordReq = req.body.password;

    const uniqueMail = await User.findOne({ where: {email: emailReq}});
    if (uniqueMail === null) {
      const saltRounds = 10;
      const hash = await bcrypt.hash(passwordReq, saltRounds)

      await User.create({
        email: emailReq,
        username: usernameReq,
        password: hash
      })
      res.status(200).json({message: "L'utilisateur a été crée avec succès"})
    } else {
      return res.status(400).json({message: "Le couple email/mot de passe existe déjà"})
  }} catch (error) {
    console.error(error);
    res.status(400).json({message: "l'utilisateur n'a pas pu être crée"})
  }
})

// route connexion utilisateur
app.post('/api/auth/local/', async(req, res) => {
  const {email, password} = req.body as IRequestUserBody;

  const user = await User.findOne({where: {email}})

  if (user === null) {
    return res.status(400).json({message: "Le couple email/mot de passe est invalide"})
  } else if (user !== null) {
    // @ts-ignore
    const passwordVerification = await bcrypt.compare(password, user.password);
      if (!passwordVerification) {
        return res.status(400).json({message: "Le couple email/mot de passe est invalide"})
      } else {
        if (!jwtSecretToken) {
          console.error('La clé secrète JWT n\'est pas définie.');
          process.exit(1); // Quitter l'application en cas de clé secrète manquante
        }
        //@ts-ignore
        const token = jwt.sign({username: user.username, email: user.email}, jwtSecretToken, {expiresIn: '1h'});
        await Tokens.create({
          token
        })
        return res.status(200).json({token});
      };
  }
  }
)

// route delete token
app.delete('http://localhost:3333/users/logout', authentificateToken, async (req, res) => {
  const tokenHeader = req.headers.authorization
  const token = tokenHeader && tokenHeader.split(' ')[1]
  try {
    await Tokens.destroy(
      {
        where: {
          token: token
        }
      }
    )
    res.status(200).json({message: "le token a été supprimé"})
  } catch (error) {
    res.status(400).json({message: "le token n'a pas pu être supprimé"})
  }

})

// récupération des info user connecté
app.get('https://localhost:3333/users/', authentificateToken, async(req, res) => {
  
  try {
    //@ts-ignore  
    const user = req.user;
    res.status(200).json({message: "info", user})
  } catch (error) {
    console.error('Erreur récupération info utilisateurs', error);
    res.status(400)
  }
  
})

// changement mot de passe
app.put('http://localhost:3333/users/change-password', authentificateToken, async(req, res) => {

  const newUserPassword = req.body.newPassword

  //@ts-ignore
  const { email } = req.user.email
  
  try {
    const user = User.findOne({
      where: {
        email
      }
    })
    res.status(200)
  } catch (error) {
    res.status(400).json({message: "l'utilisateur n'a pas été trouvé"})
  }
  
  try {
    //@ts-ignore
    await user.update({
      password: newUserPassword
    })
    res.status(200).json({message: "le mot de passe a été mis à jour"})
  } catch (error) {
    res.status(400).json({message: 'le mot de passe n\'a pas pu être modifié'})
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
app.put('http://localhost:3333/freegames/:id', authentificateToken, async(req, res) => {
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
app.delete('http://localhost:3333/freegames/:name', authentificateToken, async(req, res) => {
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
app.post('http://localhost:3333/officialgames/', authentificateToken, async(req, res) => {
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
app.get('http://localhost:3333/officialgames/', authentificateToken, async(_, res) => {
  try {
    const allOfficialGames = await OfficialGames.findAll();
    res.status(200).json(allOfficialGames);
  } catch (error) {
    console.error('Erreur récupération jeux payants', error);
  }
});

// récupérer un jeu payant
app.get('http://localhost:3333/officialgames/:name', authentificateToken, async(req, res) => {
  try {
    const oneOfficialGames = await OfficialGames.findOne({where: {name: req.params.name}});
    res.status(200).json(oneOfficialGames)
  } catch (error) {
    console.error('Erreur récupération jeu payant par nom', error)
  }
})

// modifier un jeu payant
app.put('http://localhost:3333/officialgames/:id', authentificateToken, async(req, res) => {
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
app.delete('http://localhost:3333/officialgames/:name', authentificateToken, async(req, res) => {
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