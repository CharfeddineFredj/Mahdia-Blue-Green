/**
 * Données initiales « Notre Équipe » (alignées sur mockData frontend + page À propos).
 * Upsert idempotent par `name` ; champs optionnels pour rétrocompat.
 *
 * sortOrder : ordre d’affichage sur À propos (identique à l’ordre dans mockData.users).
 */
module.exports = [
  {
    id: 1,
    sortOrder: 1,
    name: 'Jilani Messaoud',
    organization: "Membre de l'équipe Full Stack",
    role: 'Ingénieur informatique',
    email: 'naviristech@gmail.com',
    contact: '90131297',
    avatar: '/images/team/jilani-messaoud.jpg',
    linkedin: 'https://www.linkedin.com/in/jilani-messaoud-bb7794166/',
    github: 'https://www.linkedin.com/in/jilani-messaoud-bb7794166/',
    facebook: 'https://www.facebook.com/D9J6O',
  },
  {
    id: 2,
    sortOrder: 2,
    name: 'Charfeddine Fredj',
    organization: "Membre de l'équipe Full Stack",
    role: 'Ingénieur informatique',
    email: 'fradjcharf@gmail.com',
    contact: '50989069',
    avatar: '/images/team/charfeddine-fredj.jpeg',
    linkedin: 'https://www.linkedin.com/in/charfeddine-fredj-b30635141/',
    github: 'https://github.com/CharfeddineFredj',
    facebook: 'https://www.facebook.com/charf1998',
  },
  {
    id: 3,
    sortOrder: 3,
    name: 'Ala Amara',
    organization: "Membre de l'équipe backend",
    role: 'Technicien supérieur en informatique',
    email: 'amara.ala404@gmail.com',
    contact: 'amara.ala404@gmail.com',
    avatar: '/images/team/ala-amara.jpg',
    linkedin: 'https://www.linkedin.com/in/ala-amara-143a39281/',
    github: 'https://github.com/Alap06',
    facebook: 'https://www.facebook.com/ala.boxer.169',
  },


  {
    id: 4,
    sortOrder: 4,
    name: 'Israa Ayadi',
    organization: "Membre de l'équipe frontend",
    role: 'Technicien supérieur en informatique',
    email: 'israaayadi06@gmail.com',
    contact: 'israaayadi06@gmail.com',
    avatar: '/images/team/ayadi-israa.png',
    linkedin: 'https://www.linkedin.com/in/ayadi-israa-822794299/',
    github: 'https://github.com/israa642004',
    facebook: 'https://www.facebook.com/israa.ayedi',
  },
  {
    id: 5,
    sortOrder: 5,
    name: 'Molka Tlili',
    organization: "Membre de l'équipe UI/UX",
    role: 'Technicien supérieur en informatique',
    email: 'molkatlili@gmail.com',
    contact: 'molkatlili@gmail.com',
    avatar: '/images/team/molka-tlili.png',
    linkedin: 'https://www.linkedin.com/in/molka-tlili-553195298',
    github: 'https://github.com/molkatlili',
    facebook: '#',
  },


];
