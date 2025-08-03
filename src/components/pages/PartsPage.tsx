import React, { useState } from 'react';
import { PartForm } from '../forms/PartForm';

const PartsPage: React.FC<any> = ({ parts, onAddPart }) => {
  const [showPartForm, setShowPartForm] = useState(false);

  const handleAddPartClick = () => {
    setShowPartForm(true);
  };

  const handlePartSaved = (part: any) => {
    onAddPart(part);
    setShowPartForm(false);
  };

  return (
    <div className="parts-page">
      <div className="page-header">
        <h1>Parts Inventory</h1>
        <button className="btn btn-primary" onClick={handleAddPartClick}>+ Add Part</button>
      </div>

      <div className="grid grid-cols-4">
        {parts?.map((part: any) => (
          <div key={part.id} className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-2">{part.name}</h3>
              <div className="part-details">
                <div className="detail-row">
                  <span>Part #:</span>
                  <span>{part.partNumber}</span>
                </div>
                <div className="detail-row">
                  <span>Category:</span>
                  <span>{part.category}</span>
                </div>
                <div className="detail-row">
                  <span>Cost:</span>
                  <span>${part.cost}</span>
                </div>
                <div className="detail-row">
                  <span>In Stock:</span>
                  <span>{part.inventoryLevel || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span>Supplier:</span>
                  <span>{part.supplier || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )) || <p>No parts found</p>}
      </div>

      {showPartForm && (
        <PartForm
          onSuccess={handlePartSaved}
          onCancel={() => setShowPartForm(false)}
        />
      )}
    </div>
  );
};

export default PartsPage;
