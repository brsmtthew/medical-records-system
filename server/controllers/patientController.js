export async function listPatients(_req, res) {
  res.status(200).json({ data: [] });
}

export async function createPatient(req, res) {
  res.status(201).json({ data: req.body, message: "Patient record accepted." });
}

export async function updatePatient(req, res) {
  res.status(200).json({ id: req.params.id, ...req.body, message: "Patient record updated." });
}

export async function deletePatient(req, res) {
  res.status(200).json({ id: req.params.id, deleted: true });
}
