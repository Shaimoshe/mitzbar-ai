exports.handler = async (event) => {
  const plate = String(event.queryStringParameters?.plate || '').replace(/\D/g, '');
  if (!/^\d{7,8}$/.test(plate)) return {statusCode:400,body:JSON.stringify({error:'invalid_plate'})};
  const ids=['053cea08-09bc-40ec-8f7a-156f0677aff3'];
  try {
    for (const id of ids) {
      const params=new URLSearchParams({resource_id:id,filters:JSON.stringify({mispar_rechev:Number(plate)}),limit:'2'});
      const res=await fetch('https://data.gov.il/api/3/action/datastore_search?'+params,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
      if(!res.ok) throw Error('upstream '+res.status);
      const json=await res.json();
      if(!json.success) throw Error('upstream API');
      const record=(json.result?.records||[]).find(r=>String(Number(r.mispar_rechev))===String(Number(plate)));
      if(record) return {statusCode:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=3600'},body:JSON.stringify({found:true,record,source:'data.gov.il',batteryVerified:false})};
    }
    return {statusCode:200,headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({found:false,batteryVerified:false})};
  } catch(e) {return {statusCode:502,headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({error:'upstream_unavailable'})};}
};
