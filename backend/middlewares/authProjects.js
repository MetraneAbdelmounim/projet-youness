const jwt = require('jsonwebtoken');
const config = require('../config/config.js');
const { ObjectId } = require('mongodb');
const Member = require('../member/member'); // Assuming you export your db connection

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const parts = authHeader.split(' ');
    const token = parts[1];

    // Get project ID from route or query or body
  console.log(req.params);
  
    const projectId = req.params.idProject;

    if (!projectId || !ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid or missing project ID' });
    }

    const decoded = jwt.verify(token, config.secret_token_key);
    const userId = decoded.userId;


    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

   
    const user = await Member.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Allow admin OR user that owns the project
    const hasAccess = user.projects?.some(p => p.toString() === projectId);
    console.log(hasAccess);
    
    if (!hasAccess) {
      return res.status(403).json({
        error: "Vous n'êtes pas autorisé à accéder à ce projet"
      });
    }

    // All checks passed
    req.user = user; // optionally attach user to req
    next();
  } catch (err) {
    console.error('Middleware error:', err);
    res.status(401).json({
      error: "Token invalide ou utilisateur non autorisé"
    });
  }
};
