import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SearchResult = (props) => {
  const { label, onClose } = props; // 부모 컴포넌트로부터 전달받은 꽃 이름 (라벨) 및 닫기 함수
  const [flowerInfo, setFlowerInfo] = useState(null);
  const navigate = useNavigate();

  // 백엔드 서버 URL (배포 주소)
  const BACKEND_URL = "https://flowerserver-j7p8.onrender.com";

  const goShoppingPage = () => {
    if (onClose) onClose(); // 쇼핑 페이지 이동 전 다이얼로그 닫기
    navigate(`/naverShopping/${flowerInfo.flowername_kr}`);
  };

  useEffect(() => {
    const fetchFlowerInfo = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/flowers?flowername=${label}`);
        setFlowerInfo(response.data);
      } catch (error) {
        console.error('꽃 정보 조회 오류:', error);
        setFlowerInfo(null);
      }
    };
    fetchFlowerInfo();
  }, [label]);

  return (
    <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px' }}>
      {flowerInfo ? (
        <>
          <h2 style={{ color: 'darkgreen', borderBottom: '3px solid darkgreen' }}>
            {flowerInfo.flowername_kr}
          </h2>
          <table style={{ width: '100%', textAlign: 'left' }}>
            <tbody>
              <tr><th>이름</th><td>{flowerInfo.flowername}</td></tr>
              <tr><th>서식지</th><td>{flowerInfo.habitat}</td></tr>
              <tr><th>학명</th><td>{flowerInfo.binomialName}</td></tr>
              <tr><th>분류</th><td>{flowerInfo.classification}</td></tr>
              <tr>
                <th>판매 검색</th>
                <td>
                  <button onClick={goShoppingPage} style={{ backgroundColor: "#03C75A", color: "white", border: "none", display: "flex", alignItems: "center", cursor: "pointer", padding: "5px 10px", borderRadius: "4px" }}>
                    네이버 쇼핑
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <p>정보를 불러오는 중입니다...</p>
      )}
    </div>
  );
};

export default SearchResult;