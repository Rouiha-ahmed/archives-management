# Guide utilisateur

## Connexion

Ouvrez `http://localhost:3000`, saisissez l'adresse e-mail et le mot de passe fournis par l'administrateur, puis choisissez **Se connecter**. Il n'existe pas d'inscription publique.

## Demandeur

1. Ouvrez **Documents**.
2. Recherchez par référence, titre, description ou localisation.
3. Ouvrez le document souhaité puis choisissez **Demander un accès**.
4. Sélectionnez **Consultation sur site** ou **Sortie physique**.
5. Pour une sortie, indiquez une date de retour future et un motif suffisamment précis.
6. Suivez le résultat dans **Demandes**.

États visibles :

- **En attente** : décision non rendue ;
- **Approuvée** : autorisation accordée, document encore au stockage ;
- **Refusée** : accès non autorisé ;
- **En cours** : remise physique effectuée ;
- **Retournée** : mouvement clôturé.

## Validateur

1. Ouvrez **Validations**.
2. Vérifiez document, demandeur, motif et retour prévu.
3. Choisissez **Approuver** ou **Refuser**.
4. En cas de refus, renseignez obligatoirement le motif.
5. Confirmez dans la boîte de dialogue.

La validation ne remet jamais automatiquement le document.

## Archiviste

### Organiser le stockage

1. Dans **Emplacements**, créez la combinaison zone/rack/niveau.
2. Dans **Boîtes**, créez le code et sélectionnez l'emplacement.
3. Dans **Documents**, enregistrez la référence, le titre, la boîte et les métadonnées.
4. Ouvrez la boîte pour contrôler son contenu et imprimer son étiquette QR.

### Effectuer une remise

1. Ouvrez **Remises**.
2. Vérifiez bénéficiaire, référence, boîte, emplacement et retour prévu.
3. Faites signer le bénéficiaire dans la zone prévue.
4. Confirmez la remise.
5. Vérifiez le passage du document à **Sorti** dans **Historique**.

### Confirmer un retour

1. Ouvrez **Retours**.
2. Retapez la référence du document.
3. Indiquez l'état physique et la boîte de rangement.
4. Ajoutez des observations obligatoires en cas d'exception.
5. Confirmez définitivement le retour.

## Administrateur

- **Utilisateurs** : créer un compte, affecter/retirer un rôle, activer/désactiver, réinitialiser un mot de passe ;
- **Rôles et permissions** : vérifier la matrice d'autorisation ;
- **Journal d'audit** : rechercher les opérations sensibles en lecture seule.

## QR et saisie manuelle

Dans **Scanner QR**, activez volontairement la caméra ou saisissez le code de boîte. Le scan ouvre uniquement la fiche sécurisée de la boîte. Les autorisations sont toujours revérifiées côté serveur.

## Bonnes pratiques

- ne partagez pas vos identifiants ;
- contrôlez physiquement référence et état avant retour ;
- n'utilisez pas les comptes de démonstration avec des données réelles ;
- signalez immédiatement une perte, un dommage ou une incohérence ;
- déconnectez-vous après la démonstration.
