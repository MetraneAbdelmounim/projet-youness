export class Project {
    _id: string
    ville: string
    nom: string



    constructor(id: string, ville: string, nom: string) {
        this._id = id;
        this.ville = ville;
        this.nom = nom;

    }
}
