import React, { useState, useEffect } from "react";
import "../style/ClassBar.css";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import SearchResult from "./SearchResult";

const ClassBar = (props) => {
  const { label, bgcolor, completed } = props;
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <div className="total-container">
      <div className="progress-row" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <p className="label" style={{ width: '30%' }}>{label}</p>
        <div className="progress-bar" style={{ flex: 1, backgroundColor: '#e0e0de', borderRadius: '20px' }}>
          <div style={{ height: '100%', width: `${completed}%`, backgroundColor: bgcolor, borderRadius: 'inherit', textAlign: 'right', transition: 'width 1s ease-in-out' }}>
            <span className="percent" style={{ padding: '5px', color: 'white' }}>{`${completed}%`}</span>
          </div>
        </div>
        <button className="btn-color" onClick={handleOpen} style={{ marginLeft: '10px' }}>상세 보기</button>
      </div>

      <Dialog open={open} onClose={handleClose} maxWidth="lg">
        <DialogContent>
          <SearchResult label={label} onClose={handleClose} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="success" variant="contained">닫기</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ClassBar;