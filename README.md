
# Agar.io (Progetto web development)


<img src="/public/img/img-readme.png" width="600">

## Tecnologie utilizzate:

### Front-End:

- HTML
- CSS
- JavaScript
- *[Kaplay](https://kaplayjs.com/)*

### Back-End:

- *[Express](https://expressjs.com/)*
- *[Mongoose](https://mongoosejs.com/)*
- per la comunicazione real-time è stato utilizzato *[Socket.io](https://socket.io/)*

## Istruzioni

dopo aver installato le dipendenze con il comando ``npm install``
eseguire ``npm run start`` per avviare il web-server  
collegarsi a *[http://localhost:9000](http://localhost:9000)*

creare un account o utilizzare uno degli account pre-esistenti *-> username: thanos123 password: doom <-*

### Ingame-Rules:

- dopo aver mangiato una cella, quest'ultima respawna in una pos. random
- con il tasto z si spara il mini-proiettile (richiede r >= 150)
- con il tasto *spazio* si spara il proiettile grande quanto la metà del proprio raggio (richiede r >= 75)
- *NB*: per poter salvare la partita sul DB bisogna essere almeno in due giocatori