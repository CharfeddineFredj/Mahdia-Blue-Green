/**
 * Mahdia Blue & Green - Mock Data
 */

// Team member photos - using available images
import alaImage from '../assets/personal photo/Ala Amara.jpg';
import azizImage from '../assets/personal photo/mohamed aziz jlassi.jpg';
import ziedImage from '../assets/personal photo/zied fatnassi.jpeg';
import mokhtarImage from '../assets/personal photo/Mokhtar RouRou.jpg';
import ranyaImage from '../assets/personal photo/Ranya Hammami.jpg';
import IsraImage from '../assets/personal photo/Ayadi Israa.png';
import daliImage from '../assets/personal photo/Mohamed Ali Elheni.jpg';
import profileAvatar from '../assets/profile_avatar.png';
import molkaImage from '../assets/personal photo/molka tlili.png';
import ihsenImage from '../assets/personal photo/Ihsen Ben Brahim.png';
import chandoulImage from '../assets/personal photo/Oussema Chandoul.jpeg';
import harbiImage from '../assets/personal photo/mohamed harbi.jpg';
import amriImage from '../assets/personal photo/Amri Aidh.png';

// Partner logos
import apiLogo from '../assets/images/partners/api.jpg';
import enspLogo from '../assets/images/partners/ensp.jpg';
import fsegLogo from '../assets/images/partners/fseg.jpg';
import isetLogo from '../assets/images/partners/iset.jpg';
import isimaLogo from '../assets/images/partners/isima.jpg';
import issatLogo from '../assets/images/partners/issat.jpg';
import conectLogo from '../assets/images/partners/conect.jpg';
import vitailaitLogo from '../assets/images/partners/vitalait.png';


export const categories = [
    { id: 1, key: 'blue', label: 'Économie Bleue', description: 'Exploitation durable des ressources océaniques', color: '#007d90', iconType: 'wave' },
    { id: 2, key: 'green', label: 'Économie Verte', description: 'Transition vers une économie sobre en carbone', color: '#b9fe1b', iconType: 'leaf' },
    { id: 3, key: 'circular', label: 'Économie Circulaire', description: 'Réduire le gaspillage et optimiser les ressources', color: '#e7fe25', iconType: 'recycle' }
];

export const users = [
    {
        id: 1,
        name: 'Ala Amara',
        role: 'Backend Team',
        email: 'amara.ala404@gmail.com',
        avatar: alaImage,
        linkedin: 'https://www.linkedin.com/in/ala-amara-143a39281/',
        github: 'https://github.com/Alap06',
        facebook: 'https://www.facebook.com/ala.boxer.169'
    },
    {
        id: 2,
        name: 'Mohamed Aziz Jlassi',
        role: 'Backend Team',
        email: 'azizzizoujlassi@gmail.com',
        avatar: azizImage,
        linkedin: 'https://www.linkedin.com/in/aziz-jlassi111/',
        github: 'https://github.com/REFLX0',
        facebook: 'https://www.facebook.com/aziz.jl.0'
    },
    {
        id: 3,
        name: 'Zied Fatnassi',
        role: 'Frontend Team',
        email: 'ziedfatnassi42@gmail.com',
        avatar: ziedImage,
        linkedin: 'https://www.linkedin.com/in/zied-fatnassi-com',
        github: 'https://github.com/zied1fatnassi',
        facebook: 'https://www.facebook.com/share/1A3KCm9hta/?mibextid=wwXIfr'
    },
    {
        id: 5,
        name: 'Rourou Mokhtar',
        role: 'Frontend Team',
        email: 'rmokhtarrourou@gmail.com',
        avatar: mokhtarImage,
        linkedin: 'https://www.linkedin.com/in/mokhtar-rourou-b26a001b1/',
        github: 'https://github.com/RourouMokhtar',
        facebook: '#'
    },
    {
        id: 4,
        name: 'Amri Aidh',
        role: 'Frontend Team',
        email: 'amriaidh715@gmail.com',
        avatar: amriImage,
        linkedin: 'https://www.linkedin.com/in/amri-aidh-a3149424b/',
        github: 'https://github.com/aidh04',
        facebook: 'https://www.facebook.com/aidh.amri.92'
    },
    {
        id: 7,
        name: 'Oussema Chandoul',
        role: 'Backend Team',
        email: 'ochandoul76@gmail.com',
        avatar: chandoulImage,
        linkedin: 'https://www.linkedin.com/in/oussema-chandoul-b92297399/',
        github: 'https://github.com/OSsch',
        facebook: 'https://www.facebook.com/oussama.chandoul.35'
    },
    {
        id: 6,
        name: 'Mohamed Harbi',
        role: 'Backend Team',
        email: 'hrbim756@gmail.com',
        avatar: harbiImage,
        linkedin: 'https://www.linkedin.com/in/mohamed-harbi-4385471ab/',
        github: 'https://github.com/Mharbi187',
        facebook: 'https://www.facebook.com/mohamed.harbi.371662'
    }, {
        id: 9,
        name: 'Ranya Hammami',
        role: 'Backend Team',
        email: 'ranyahammami57@gmail.com',
        avatar: ranyaImage,
        linkedin: '#',
        github: 'https://github.com/ranya3',
        facebook: '#'
    },
    {
        id: 10,
        name: 'Israa Ayadi',
        role: 'Frontend Team',
        email: 'israaayadi06@gmail.com',
        avatar: IsraImage,
        linkedin: 'https://www.linkedin.com/in/ayadi-israa-822794299/',
        github: 'https://github.com/israa642004',
        facebook: 'https://www.facebook.com/israa.ayedi'
    },
    {
        id: 11,
        name: 'Molka Tlili',
        role: 'Frontend Team',
        email: 'molkatlili@gmail.com',
        avatar: molkaImage,
        linkedin: 'https://www.linkedin.com/in/molka-tlili-553195298',
        github: 'https://github.com/molkatlili',
        facebook: '#'
    },
    {
        id: 8,
        name: 'Mohamed Ali Heni',
        role: 'Backend Team',
        email: 'mohamedalielheni.04@gmail.com',
        avatar: daliImage,
        linkedin: 'https://www.linkedin.com/in/mohamed-ali-heni-4738b5299',
        github: 'https://github.com/monjila3wer01',
        facebook: 'https://www.facebook.com/mohamedali.heni12345'
    },

    {
        id: 12,
        name: 'Ihsen Ben Brahim',
        role: 'Frontend Team',
        email: 'ihsenbenbrahim509@gmail.com',
        avatar: ihsenImage,
        linkedin: 'https://www.linkedin.com/in/ihsen-ben-brahim-3a09b429a',
        github: 'https://github.com/ihsen504',
        facebook: 'https://www.facebook.com/ihsen.benbrahim.5/'
    }
];


export const testimonials = [
    { id: 1, name: 'Habib Ataoui', role: 'Entrepreneur', organization: 'Mahdia Blue & Green', quote: "Un programme qui a transformé ma vision de l'entrepreneuriat durable.", avatar: profileAvatar },
    { id: 2, name: 'Imed Alaya', role: 'Entrepreneur', organization: 'Mahdia Blue & Green', quote: "Grâce à ce programme, j'ai pu développer mon projet avec un accompagnement de qualité.", avatar: profileAvatar },
    { id: 3, name: 'Rahma Essid', role: 'Entrepreneure', organization: 'Mahdia Blue & Green', quote: "Une expérience enrichissante qui m'a ouvert de nouvelles perspectives.", avatar: profileAvatar },
    { id: 4, name: 'Ramy Yahya', role: 'Entrepreneur', organization: 'Mahdia Blue & Green', quote: "Le réseau d'entrepreneurs m'a permis de trouver des partenaires précieux.", avatar: profileAvatar },
    { id: 5, name: 'Samahni Hafsa', role: 'Entrepreneure', organization: 'Mahdia Blue & Green', quote: "Les formations proposées sont d'une grande qualité et très pratiques.", avatar: profileAvatar },
    { id: 6, name: 'Hafedh Boukthir', role: 'Entrepreneur', organization: 'Mahdia Blue & Green', quote: "Je recommande vivement ce programme à tous les entrepreneurs de la région.", avatar: profileAvatar }
];

export const partners = [
    { id: 1, name: 'API', logo: apiLogo },
    { id: 2, name: 'ENSP', logo: enspLogo },
    { id: 3, name: 'FSEG', logo: fsegLogo },
    { id: 4, name: 'ISET', logo: isetLogo },
    { id: 5, name: 'ISIMA', logo: isimaLogo },
    { id: 6, name: 'ISSAT', logo: issatLogo },
    { id: 7, name: 'CONECT', logo: conectLogo },
    { id: 8, name: 'VITALAIT', logo: vitailaitLogo },
];

export const questionnaires = [
    {
        id: 1,
        title: 'Inscription aux événements',
        description: 'Formulaire d\'inscription standard.',
        questions: [
            { id: 'name', label: 'Nom complet', type: 'text', required: true },
            { id: 'email', label: 'Email', type: 'text', required: true },
            { id: 'organization', label: 'Organisation', type: 'text', required: false },
            { id: 'city', label: 'Ville', type: 'text', required: true },
            { id: 'interests', label: 'Domaines d\'intérêt', type: 'multiple_choice', options: ['Économie bleue', 'Économie verte', 'Économie circulaire'], required: true },
            { id: 'consent', label: 'J\'accepte de recevoir des informations', type: 'boolean', required: true }
        ]
    },
    {
        id: 2,
        title: 'Enquête de satisfaction',
        description: 'Donnez-nous votre avis.',
        questions: [
            { id: 'rating', label: 'Évaluez votre expérience', type: 'rating', required: true },
            { id: 'recommend', label: 'Recommanderiez-vous ?', type: 'single_choice', options: ['Certainement', 'Probablement', 'Non'], required: true },
            { id: 'improvements', label: 'Suggestions', type: 'textarea', required: false }
        ]
    }
];
