/**
 * Mahdia Blue & Green - Economy Definitions
 * Knowledge base for the chatbot
 */

const economyDefinitions = {
  blueEconomy: {
    name: "Économie Bleue",
    definition: `L'économie bleue (ou économie océanique) désigne l'utilisation durable des ressources océaniques 
et côtières pour la croissance économique, l'amélioration des moyens de subsistance et la création d'emplois, 
tout en préservant la santé des écosystèmes marins et côtiers.`,
    
    sectors: [
      "Pêche durable et aquaculture responsable",
      "Tourisme côtier et maritime",
      "Transport maritime",
      "Énergies marines renouvelables (éolien offshore, énergie des vagues)",
      "Biotechnologies marines",
      "Extraction minière sous-marine durable",
      "Dessalement de l'eau de mer"
    ],
    
    tunisiaContext: `En Tunisie, et particulièrement à Mahdia, l'économie bleue représente une opportunité majeure 
grâce à 1300 km de côtes méditerranéennes. Les secteurs prioritaires incluent:
- La pêche artisanale durable (Mahdia est l'un des principaux ports de pêche)
- L'aquaculture (élevage de poissons, mollusques)
- Le tourisme balnéaire responsable
- La protection du patrimoine maritime`,

    mahdiaSpecific: `Mahdia, surnommée "la ville aux deux visages" (mer et agriculture), possède:
- Un port de pêche parmi les plus actifs de Tunisie
- Une tradition maritime ancestrale
- Des plages préservées propices à l'écotourisme
- Un patrimoine historique lié à la mer (médina, fortifications)`
  },

  blueCircularEconomy: {
    name: "Économie Bleue Circulaire",
    definition: `L'économie bleue circulaire combine les principes de l'économie bleue avec ceux de l'économie circulaire. 
Elle vise à créer des chaînes de valeur maritimes où les déchets d'une activité deviennent les ressources d'une autre, 
minimisant ainsi l'impact environnemental tout en maximisant la valeur économique.`,
    
    examples: [
      "Recyclage des filets de pêche en matériaux textiles ou plastiques",
      "Valorisation des coproduits de la pêche (transformation des déchets de poisson en farine, huile, engrais)",
      "Utilisation des algues pour la cosmétique, l'alimentation ou les biocarburants",
      "Réutilisation des coquilles de mollusques",
      "Nettoyage des océans et recyclage des plastiques marins",
      "Écoconception des bateaux et équipements de pêche"
    ],
    
    mahdiaInitiatives: [
      "Programme de recyclage des filets de pêche usagés",
      "Valorisation des coproduits de la criée de Mahdia",
      "Sensibilisation des pêcheurs aux pratiques durables",
      "Collecte et recyclage des plastiques sur les plages"
    ]
  },

  greenEconomy: {
    name: "Économie Verte",
    definition: `L'économie verte est un modèle économique qui vise à améliorer le bien-être humain et l'équité sociale, 
tout en réduisant significativement les risques environnementaux et les pénuries écologiques. 
Elle est sobre en carbone, efficiente en ressources et socialement inclusive.`,
    
    sectors: [
      "Agriculture durable et régénérative",
      "Énergies renouvelables (solaire, éolien)",
      "Efficacité énergétique dans le bâtiment et l'industrie",
      "Transports propres",
      "Gestion durable de l'eau",
      "Foresterie durable",
      "Éco-industrie et technologies propres"
    ],
    
    tunisiaContext: `La Tunisie s'est engagée dans la transition vers une économie verte à travers:
- Le Plan Solaire Tunisien
- La Stratégie Nationale de Développement Durable
- Les programmes d'efficacité énergétique
- Le soutien à l'agriculture biologique
À Mahdia, les opportunités incluent l'agriculture oléicole durable, le solaire photovoltaïque et l'efficacité énergétique.`
  },

  circularEconomy: {
    name: "Économie Circulaire",
    definition: `L'économie circulaire est un modèle économique qui vise à produire des biens et des services 
de manière durable en limitant la consommation et le gaspillage des ressources et la production de déchets. 
Elle repose sur le principe des "3R": Réduire, Réutiliser, Recycler.`,
    
    principles: [
      "Écoconception (concevoir des produits durables et recyclables)",
      "Écologie industrielle (mutualiser les ressources entre entreprises)",
      "Économie de la fonctionnalité (vendre l'usage plutôt que le produit)",
      "Réemploi et réutilisation",
      "Réparation et reconditionnement",
      "Recyclage des matières"
    ],
    
    tunisiaContext: `En Tunisie, l'économie circulaire se développe notamment dans:
- La gestion des déchets (tri, recyclage, valorisation)
- L'industrie textile (recyclage des chutes, mode durable)
- L'agroalimentaire (valorisation des coproduits)
- La construction (matériaux recyclés, déconstruction sélective)`
  }
};

module.exports = economyDefinitions;
